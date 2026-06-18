"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setZodFormErrors } from "@/lib/forms/set-zod-form-errors";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validators/auth.schema";

type ForgotPasswordValues = {
  email: string;
};

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const form = useForm<ForgotPasswordValues>({
    defaultValues: {
      email: "",
    },
  });

  async function handleReset(values: ForgotPasswordValues) {
    form.clearErrors();
    const parsedValues = forgotPasswordSchema.safeParse(values);

    if (!parsedValues.success) {
      setZodFormErrors(form, parsedValues.error);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(parsedValues.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message || "Failed to send reset link");
      return;
    }

    toast.success("Reset link sent to your email.");
  }

  return (
    <div className="space-y-6 rounded-3xl bg-card p-6 text-card-foreground shadow-soft-lg ring-1 ring-foreground/10">
      <div className="space-y-2">
        <h2 className="text-center text-xl font-semibold">Reset Password</h2>
        <p className="text-center text-sm text-muted-foreground">
          Enter your email to receive a password reset link.
        </p>
      </div>

      <form className="space-y-4" onSubmit={form.handleSubmit(handleReset)}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="name@example.com" {...form.register("email")} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <div className="text-center text-sm">
        Remembered your password?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
