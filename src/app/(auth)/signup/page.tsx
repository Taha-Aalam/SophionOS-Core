"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPostLoginRedirectPath } from "@/lib/auth/auth-routing";
import { setZodFormErrors } from "@/lib/forms/set-zod-form-errors";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validators/auth.schema";

type SignupValues = {
  email: string;
  password: string;
};

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const form = useForm<SignupValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const postLoginPath = getPostLoginRedirectPath(searchParams.get("next"));

  async function handleSignup(values: SignupValues) {
    form.clearErrors();
    const parsedValues = signupSchema.safeParse(values);

    if (!parsedValues.success) {
      setZodFormErrors(form, parsedValues.error);
      return;
    }

    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", postLoginPath);

    const { data, error } = await supabase.auth.signUp({
      ...parsedValues.data,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      toast.error(error.message || "Signup failed");
      return;
    }

    if (data.session) {
      toast.success("Account created successfully.");
      router.replace(postLoginPath);
      router.refresh();
      return;
    }

    toast.success("Check your email for confirmation.");
    router.replace("/login?message=check-email");
  }

  async function handleGoogleSignup() {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", postLoginPath);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      toast.error(error.message || "Google signup failed");
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm">
      <div className="space-y-2">
        <h2 className="text-center text-xl font-semibold">Create Account</h2>
        <p className="text-center text-sm text-muted-foreground">
          Join LifeOS and start mastering your time.
        </p>
      </div>

      <form className="space-y-4" onSubmit={form.handleSubmit(handleSignup)}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="name@example.com" {...form.register("email")} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...form.register("password")} />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={handleGoogleSignup}
        className="w-full"
        disabled={form.formState.isSubmitting}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.52-2.28 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.1-4.53H2.18v2.84C3.99 21.55 7.83 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09C5.44 13.56 5.1 13.03 5.1 11.56 5.44 10.03L2.18 8.25C1.48 9.14 1 10.2 1 11.35v2.84c0 .33.11.63.33.85l3.51-2.24z" fill="#FBBC05" />
          <path d="M5.84 14.09c-.36.53-.73 1.06-1.16 1.59L2.18 17.14c.44.44 1.02.77 1.66 1.02l3.51-2.24z" fill="#EA4335" />
          <path d="M12 5.33c1.58 0 2.96.54 4.1 1.5l2.85-2.85C17.45 2.29 14.97 1 12 1 7.83 1 4.12 3.34 2.18 6.25l3.66 2.84c.81-1.32 2.16-2.24 3.71-2.24z" fill="#4285F4" />
        </svg>
        Google
      </Button>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 rounded-2xl border bg-card p-6 text-card-foreground shadow-sm animate-pulse">
          <div className="h-64 rounded bg-muted" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
