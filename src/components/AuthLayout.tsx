import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import occLogo from "@/assets/OCC logo.webp";

// Put this file at src/components/AuthLayout.tsx
// (or change the import path in LoginPage and ForgotPasswordPage).

const EASE = [0.22, 1, 0.36, 1] as const;

// Shared styles so both pages stay identical
export const authInputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#16305C] focus:ring-4 focus:ring-[#16305C]/10";

export const authButtonClass =
    "mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#16305C] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#0F2245] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D7A32E]/40";

export const authLabelClass = "mb-1.5 block text-sm font-medium text-slate-800";

const POINTS = [
    "Schedules and time logs",
    "Document approvals",
    "Daily and weekly reports",
];

function BrandPanel() {
    return (
        <aside className="relative hidden overflow-hidden bg-[#16305C] lg:flex lg:flex-col lg:justify-between lg:p-14">
            {/* Decoration */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[32px] border-[#D7A32E]/25" />
            <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-white/[0.04]" />

            <Link
                to="/"
                className="relative z-10 flex w-fit items-center gap-2.5 rounded-lg text-xl font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A32E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16305C]"
            >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white p-1.5">
                    <img src={occLogo} alt="OCC logo" className="h-full w-full object-contain" />
                </span>
                Intern
            </Link>

            <div className="relative z-10 max-w-md">
                <motion.h2
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                    className="text-4xl font-bold leading-[1.1] tracking-tight text-white text-balance"
                >
                    Everything about your interns, in one place.
                </motion.h2>

                {/* The line draws down and each point checks off */}
                <div className="relative mt-10">
                    <div className="absolute bottom-3 left-3 top-3 w-px bg-white/15">
                        <motion.div
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 1.1, delay: 0.5, ease: EASE }}
                            className="h-full origin-top bg-[#D7A32E]"
                        />
                    </div>
                    <ul>
                        {POINTS.map((point, i) => (
                            <li key={point} className="relative flex items-center gap-4 py-3">
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 420,
                                        damping: 20,
                                        delay: 0.5 + i * 0.35,
                                    }}
                                    className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#D7A32E] text-[#16305C]"
                                >
                                    <Check size={14} strokeWidth={3} />
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.45, delay: 0.55 + i * 0.35, ease: EASE }}
                                    className="text-base font-medium text-white/90"
                                >
                                    {point}
                                </motion.span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <p className="relative z-10 text-sm text-white/50">
                © {new Date().getFullYear()} OCC Intern
            </p>
        </aside>
    );
}

export function AuthLayout({
    title,
    description,
    backTo,
    backLabel,
    children,
}: {
    title: string;
    description: string;
    backTo: string;
    backLabel: string;
    children: ReactNode;
}) {
    return (
        // reducedMotion="user" turns movement off for people who ask their OS for less motion
        <MotionConfig reducedMotion="user">
            <div className="grid min-h-screen bg-[#FBFAF7] font-sans text-slate-900 lg:grid-cols-2">
                <BrandPanel />

                <main className="relative flex items-center justify-center overflow-hidden px-6 py-10 sm:px-12">
                    {/* Faint dot grid */}
                    <div
                        className="pointer-events-none absolute inset-0"
                        style={{
                            backgroundImage:
                                "radial-gradient(rgba(22,48,92,0.10) 1px, transparent 1px)",
                            backgroundSize: "24px 24px",
                            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
                            WebkitMaskImage:
                                "radial-gradient(ellipse at center, black 20%, transparent 75%)",
                        }}
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, ease: EASE }}
                        className="relative w-full max-w-md"
                    >
                        {/* Brand, shown when the side panel is hidden */}
                        <div className="mb-8 flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#16305C] lg:hidden">
                            <img src={occLogo} alt="OCC logo" className="h-9 w-9 object-contain" />
                            Intern
                        </div>

                        <Link
                            to={backTo}
                            className="group mb-8 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:text-[#16305C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A32E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBFAF7]"
                        >
                            <ArrowLeft
                                size={16}
                                className="transition-transform group-hover:-translate-x-0.5"
                            />
                            {backLabel}
                        </Link>

                        <h1 className="text-3xl font-bold tracking-tight text-[#16305C]">{title}</h1>
                        <p className="mt-2.5 text-[15px] leading-7 text-slate-600">{description}</p>

                        {children}
                    </motion.div>
                </main>
            </div>
        </MotionConfig>
    );
}