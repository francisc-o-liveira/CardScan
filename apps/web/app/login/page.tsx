"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { loginSchema, type LoginInput } from "@cardscan/validation";
import { useAuth } from "@/providers/AuthProvider";

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
      router.push("/dashboard");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to sign in");
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-base-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ScanLine className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">CardScan</h1>
          <p className="text-sm text-base-content/60">Scan. Identify. Collect.</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="card border border-base-300 bg-base-200 shadow-sm"
          noValidate
        >
          <div className="card-body gap-4">
            <h2 className="card-title text-base font-medium">Welcome back</h2>

            {formError && (
              <div role="alert" className="alert alert-error py-2 text-sm">
                <span>{formError}</span>
              </div>
            )}

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Email</span>
              </div>
              <input
                type="email"
                className="input input-bordered"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <span className="mt-1 text-xs text-error">{errors.email.message}</span>
              )}
            </label>

            <label className="form-control">
              <div className="label py-1">
                <span className="label-text">Password</span>
              </div>
              <input
                type="password"
                className="input input-bordered"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <span className="mt-1 text-xs text-error">{errors.password.message}</span>
              )}
            </label>

            <button type="submit" className="btn btn-primary mt-2" disabled={isSubmitting}>
              {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : "Sign in"}
            </button>

            <p className="text-center text-sm text-base-content/60">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="link link-primary">
                Create one
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
