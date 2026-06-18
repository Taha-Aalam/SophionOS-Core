"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_POST_LOGIN_PATH } from "@/lib/auth/auth-routing";
import { setZodFormErrors } from "@/lib/forms/set-zod-form-errors";
import { createClient } from "@/lib/supabase/client";

const resetPasswordSchema = z
  .object({
    confirmPassword: z.string().min(8, "Password must be at least 8 characters."),
    password: z.string().min(8, "Password must be at least 8 characters."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const form = useForm<ResetPasswordValues>({
    defaultValues: {
      confirmPassword: "",
      password: "",
    },
  });
  const router = useRouter();
  const { isLoading, session } = useAuth();
  const supabase = createClient();

  async function handleSubmit(values: ResetPasswordValues) {
    form.clearErrors();
    const parsedValues = resetPasswordSchema.safeParse(values);

    if (!parsedValues.success) {
      setZodFormErrors(form, parsedValues.error);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: parsedValues.data.password });

    if (error) {
      toast.error(error.message || "Unable to update your password.");
      return;
    }

    toast.success("Password updated successfully.");
    router.replace(DEFAULT_POST_LOGIN_PATH);
    router.refresh();
  }

  return (
    <div className="rounded-3xl bg-card p-6 text-card-foreground shadow-soft-lg ring-1 ring-foreground/10">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold">Choose a new password</h2>
        <p className="text-sm text-muted-foreground">
          Finish your recovery flow by setting a new password for your LifeOS account.
        </p>
      </div>

      {isLoading ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Verifying your recovery session...
        </div>
      ) : !session ? (
        <div className="mt-6 space-y-4 rounded-lg border border-dashed border-border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            This reset link is no longer active. Request a fresh password reset email to continue.
          </p>
          <Button className="w-full" onClick={() => router.push("/forgot-password")} type="button">
            Request a new reset link
          </Button>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" {...form.register("password")} />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            ) : null}
          </div>
          <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? "Updating password..." : "Update password"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Need a fresh link?{" "}
            <Link className="text-primary underline-offset-4 hover:underline" href="/forgot-password">
              Request another email
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
