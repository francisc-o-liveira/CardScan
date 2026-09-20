"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { loginSchema, type LoginInput } from "@cardscan/validation";
import { useAuth } from "@/providers/AuthProvider";
import { getErrorMessage } from "@/lib/api-error";
import { AuthShell } from "@/components/layout/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { hasSeenOnboarding } from "@/lib/onboarding";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    try {
      await login(values);
      // Returning users go straight in; a fresh browser sees the three
      // welcome screens once.
      router.push(hasSeenOnboarding() ? "/home" : "/welcome");
    } catch (error) {
      setFormError(getErrorMessage(error, "We couldn't sign you in. Check your email and password and try again."));
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New to CardScan?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form
        method="post"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-error/35 bg-error/10 px-3.5 py-3 text-meta text-error"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" variant="primary" size="lg" block isLoading={isSubmitting} className="mt-2">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
