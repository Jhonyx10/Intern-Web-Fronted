import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import {
    AuthLayout,
    authButtonClass,
    authInputClass,
    authLabelClass,
} from "@/components/AuthLayout";

export function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function onSubmit(event: FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await apiRequest<{ message: string }>("/auth/forgot-password", {
                method: "POST",
                body: { email },
            });
            setSuccess(res.message);
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthLayout
            title="Forgot password"
            description="Enter your registered email address and we'll send a new system-generated password to your inbox."
            backTo="/login"
            backLabel="Back to sign in"
        >
            {success ? (
                <motion.div
                    role="status"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-8 text-center"
                >
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.15 }}
                        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                    >
                        <MailCheck size={28} />
                    </motion.span>
                    <p className="mt-4 text-sm font-medium leading-6 text-emerald-900">{success}</p>
                    <Link
                        to="/login"
                        className="mt-5 inline-block rounded text-sm font-semibold text-[#16305C] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A32E]"
                    >
                        Back to sign in
                    </Link>
                </motion.div>
            ) : (
                <form onSubmit={(event) => void onSubmit(event)} className="mt-8">
                    <div>
                        <label htmlFor="email" className={authLabelClass}>
                            Email address
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
                                Sending…
                            </>
                        ) : (
                            "Send new password"
                        )}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}