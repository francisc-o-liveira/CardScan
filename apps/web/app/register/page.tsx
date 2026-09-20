"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { registerSchema, type RegisterInput } from "@cardscan/validation";
import { useAuth } from "@/providers/AuthProvider";
import { getErrorMessage } from "@/lib/api-error";
import { AuthShell } from "@/components/layout/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null);
    try {
      await registerUser(values);
      // New accounts always see the welcome screens.
      router.push("/welcome");
    } catch (error) {
      setFormError(getErrorMessage(error, "We couldn't create your account. Please try again."));
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking your collection in a couple of minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
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
          label="Username"
          type="text"
          autoComplete="username"
          placeholder="How other collectors will see you"
          error={errors.username?.message}
          {...register("username")}
        />

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
          autoComplete="new-password"
          hint="At least 8 characters, with an uppercase letter, a lowercase letter and a number."
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" variant="primary" size="lg" block isLoading={isSubmitting} className="mt-2">
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
