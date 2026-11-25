import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  AuthLayout,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from "@/components/AuthLayout";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      description="Manage intern schedules, time logs, and document approvals from one place."
      backTo="/"
      backLabel="Back to home"
    >
      <form onSubmit={(event) => void onSubmit(event)} className="mt-8">
        <div className="space-y-5">
          <div>
            <label htmlFor="email" className={authLabelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={authInputClass}
              required
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-800">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="rounded text-sm font-medium text-slate-500 transition-colors hover:text-[#16305C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A32E]"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={`${authInputClass} pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-[#16305C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A32E]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#B23A3A]/20 bg-[#B23A3A]/5 px-4 py-3 text-sm text-[#8F2B2B]"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {error}
          </motion.div>
        ) : null}

        <button type="submit" disabled={submitting} className={authButtonClass}>
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}