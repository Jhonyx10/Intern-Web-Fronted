import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import OCCLogo from '@/assets/OCC logo.webp'

export function LandingPage() {
    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#FBFAF7] text-slate-900 font-sans flex flex-col">
            {/* Decorative background shapes matching Login Page */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#16305C]/5" />
                <div className="absolute top-10 left-[20%] h-48 w-48 rounded-full border-[16px] border-[#D7A32E]/20" />

                <div className="absolute -bottom-48 -right-32 h-[800px] w-[800px] rotate-12 bg-[#16305C]/10" />
                <div className="absolute bottom-20 right-[30%] h-32 w-32 rounded-full bg-[#D7A32E]/20" />

                <div className="absolute top-32 right-[10%] h-6 w-6 rounded-full bg-[#B23A3A]/40" />
                <div className="absolute top-1/2 left-[15%] h-20 w-20 rounded-full border-4 border-[#16305C]/15" />
            </div>

            {/* Nav */}
            <nav className="shrink-0 z-50 border-b border-[#16305C]/10 bg-white/70 backdrop-blur-md relative">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-8">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-[#16305C]">
                        <img src={OCCLogo} alt="OCC Logo" className="h-8 w-8 object-contain" />
                        Intern
                    </div>
                    <div>
                        <Link
                            to="/login"
                            className="text-sm font-semibold leading-6 text-slate-700 hover:text-[#16305C] transition"
                        >
                            Sign in <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <main className="flex-1 flex items-center justify-center relative z-10">
                <div className="flex items-center justify-center p-8 lg:p-16">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-2xl text-left"
                    >
                        <p className="text-sm font-semibold tracking-widest text-[#B23A3A] uppercase mb-4">
                            Intern Portal
                        </p>
                        <h1 className="text-4xl font-bold tracking-tight text-[#16305C] sm:text-5xl lg:text-6xl text-balance">
                            Manage Internships with <span className="text-[#D7A32E]">Confidence</span>
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-slate-600 text-pretty">
                            The complete platform for linking students, coordinators, and supervisors.
                            Track attendance, evaluate performance, and streamline the OJT lifecycle.
                        </p>
                        <div className="mt-10 flex flex-wrap items-center gap-4">
                            <Link
                                to="/login"
                                className="rounded-xl bg-[#16305C] px-8 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#0F2245] transition-all hover:scale-105 active:scale-95"
                            >
                                Get started
                            </Link>
                            <a
                                href="/app/app-release.apk"
                                download="InternApp.apk"
                                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#16305C] px-6 py-3 text-sm font-semibold text-[#16305C] hover:bg-[#16305C] hover:text-white transition-all hover:scale-105 active:scale-95"
                            >
                                <Download size={16} />
                                Download App
                            </a>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    )
}