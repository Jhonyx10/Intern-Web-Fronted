import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ApiError, apiRequest } from "@/lib/api";
import occLogo from "@/assets/OCC logo.webp";
import { ArrowLeft, MailCheck } from "lucide-react";

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
            setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 bg-[#FBFAF7] font-sans">
            {/* Decorative background — same as LoginPage */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-[#16305C]" />
                <div className="absolute -top-6 left-24 h-40 w-40 rounded-full border-[14px] border-[#D7A32E]" />
                <div className="absolute -bottom-24 -right-24 h-96 w-96 rotate-12 bg-[#16305C]" />
                <div className="absolute bottom-10 right-10 h-24 w-24 rounded-full bg-[#D7A32E]" />
                <div className="absolute top-16 right-[18%] h-4 w-4 rounded-full bg-[#B23A3A]" />
                <div className="absolute bottom-1/3 left-12 h-14 w-14 rounded-full border-2 border-[#16305C]/25" />
            </div>

            <motion.form
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                onSubmit={(event) => void onSubmit(event)}
                className="relative z-10 w-full max-w-md rounded-3xl border border-[#16305C]/10 bg-white p-8 shadow-[0_30px_60px_-30px_rgba(22,48,92,0.35)]"
            >
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#16305C] transition-colors mb-6"
                >
                    <ArrowLeft size={16} /> Back to Login
                </Link>

                <div className="mb-6 flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#FBFAF7] ring-1 ring-[#16305C]/10 p-1.5">
                        <img src={occLogo} alt="OCC logo" className="h-full w-full object-contain" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold tracking-[0.15em] text-[#B23A3A] uppercase">
                            Intern Portal
                        </p>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#16305C]">
                            Forgot Password
                        </h1>
                    </div>
                </div>

                <p className="text-sm text-slate-500 leading-relaxed">
                    Enter your registered email address and we'll send a new system-generated password to your inbox.
                </p>

                {/* Success state */}
                {success ? (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-7 flex flex-col items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-6 py-6 text-center"
                    >
                        <MailCheck size={36} className="text-green-600" />
                        <p className="text-sm font-medium text-green-800">{success}</p>
                        <Link
                            to="/login"
                            className="mt-1 text-sm font-semibold text-[#16305C] underline-offset-2 hover:underline"
                        >
                            Go back to Login
                        </Link>
                    </motion.div>
                ) : (
                    <>
                        <div className="mt-7 space-y-4">
                            <label className="block text-sm font-medium text-[#1F2937]">
                                Email Address
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="you@example.com"
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 outline-none transition focus:border-[#16305C] focus:ring-4 focus:ring-[#16305C]/10"
                                    required
                                />
                            </label>
                        </div>

                        {error ? (
                            <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 text-sm text-[#B23A3A]"
                            >
                                {error}
                            </motion.p>
                        ) : null}

                        <motion.button
                            type="submit"
                            disabled={submitting}
                            whileHover={{ scale: submitting ? 1 : 1.01 }}
                            whileTap={{ scale: submitting ? 1 : 0.98 }}
                            className="mt-7 w-full rounded-xl bg-[#16305C] px-4 py-3 font-semibold text-white shadow-[0_14px_28px_-16px_rgba(22,48,92,0.9)] transition hover:bg-[#0F2245] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {submitting ? "Sending…" : "Send New Password"}
                        </motion.button>
                    </>
                )}
            </motion.form>
        </div>
    );
}
