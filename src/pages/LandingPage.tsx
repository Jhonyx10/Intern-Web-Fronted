import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { animate, motion, MotionConfig, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    Check,
    ClipboardCheck,
    Download,
    FileText,
    GraduationCap,
    MapPin,
    ScanFace,
    UserCheck,
    Users,
    WifiOff,
} from 'lucide-react'
import OCCLogo from '@/assets/OCC logo.webp'

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const NAVY = '#16305C'
const GOLD = '#D7A32E'
const EASE = [0.22, 1, 0.36, 1] as const

const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A32E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBFAF7]'

const APK_URL = '/app/app/app-release.apk'

function jumpTo(id: string) {
    return (e: MouseEvent) => {
        e.preventDefault()
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function Reveal({
    children,
    delay = 0,
    className,
}: {
    children: ReactNode
    delay?: number
    className?: string
}) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay, ease: EASE }}
        >
            {children}
        </motion.div>
    )
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */

function Nav() {
    return (
        <header className="sticky top-0 z-50 border-b border-[#16305C]/10 bg-white/80 backdrop-blur-md">
            <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-8">
                <Link
                    to="/"
                    className={`flex items-center gap-2.5 rounded-lg text-xl font-bold tracking-tight text-[#16305C] ${focusRing}`}
                >
                    <img src={OCCLogo} alt="OCC logo" className="h-9 w-9 object-contain" />
                    Intern
                </Link>

                <div className="flex items-center gap-1 sm:gap-2">
                    <a
                        href="#features"
                        onClick={jumpTo('features')}
                        className={`hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-[#16305C] sm:block ${focusRing}`}
                    >
                        Features
                    </a>
                    <a
                        href="#how-it-works"
                        onClick={jumpTo('how-it-works')}
                        className={`hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-[#16305C] sm:block ${focusRing}`}
                    >
                        How it works
                    </a>
                    <Link
                        to="/login"
                        className={`ml-2 rounded-xl bg-[#16305C] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0F2245] active:scale-95 ${focusRing}`}
                    >
                        Sign in
                    </Link>
                </div>
            </nav>
        </header>
    )
}

/* ------------------------------------------------------------------ */
/* Hero preview: a live-looking attendance card                        */
/* This is the one orchestrated moment on the page.                    */
/* ------------------------------------------------------------------ */

const TIMELINE = [
    { label: 'Morning time in', time: '8:02 AM', note: 'Face verified' },
    { label: 'Morning time out', time: '12:01 PM' },
    { label: 'Afternoon time in', time: '12:58 PM' },
    { label: 'Afternoon time out', time: '5:03 PM' },
]

// Hours shown after each step of the sequence (index = step)
const HOURS_AT = [0, 0, 3.98, 3.98, 8.07, 8.07]

function AttendancePreview() {
    const reduce = useReducedMotion()
    const [step, setStep] = useState(0)
    const [hours, setHours] = useState(0)

    const complete = step > TIMELINE.length
    const started = step > 0

    // Plays once on load: each punch lands, then the day completes.
    useEffect(() => {
        if (reduce) {
            setStep(TIMELINE.length + 1)
            return
        }
        const timers = Array.from({ length: TIMELINE.length + 1 }, (_, i) =>
            window.setTimeout(() => setStep(i + 1), 1000 + i * 950),
        )
        return () => timers.forEach(window.clearTimeout)
    }, [reduce])

    useEffect(() => {
        const target = HOURS_AT[Math.min(step, HOURS_AT.length - 1)]
        const controls = animate(hours, target, {
            duration: reduce ? 0 : 0.8,
            ease: 'easeOut',
            onUpdate: setHours,
        })
        return () => controls.stop()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, reduce])

    const today = new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })

    const status = complete
        ? { label: 'Completed', color: '#64748B' }
        : started
            ? { label: 'In progress', color: '#059669' }
            : { label: 'Not started', color: '#94A3B8' }

    return (
        <div className="relative mx-auto w-full max-w-md">
            {/* Gold ring sits behind the card */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full border-[14px] border-[#D7A32E]/25" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
                className="relative rounded-3xl border border-[#16305C]/10 bg-white p-6 shadow-[0_30px_60px_-20px_rgba(22,48,92,0.25)]"
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500">Today's attendance</p>
                        <p className="mt-0.5 text-base font-semibold text-[#16305C]">{today}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5">
                        <span
                            className="h-2 w-2 rounded-full transition-colors duration-500"
                            style={{ backgroundColor: status.color }}
                        />
                        <span
                            className="text-xs font-semibold transition-colors duration-500"
                            style={{ color: status.color }}
                        >
                            {status.label}
                        </span>
                    </div>
                </div>

                {/* Timeline */}
                <ul className="mt-5">
                    {TIMELINE.map((row, i) => {
                        const done = step > i
                        return (
                            <li
                                key={row.label}
                                className="flex items-center justify-between border-t border-slate-100 py-3.5"
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-300"
                                        style={{
                                            borderColor: done ? NAVY : '#E2E8F0',
                                            backgroundColor: done ? NAVY : 'transparent',
                                        }}
                                    >
                                        <motion.span
                                            initial={false}
                                            animate={done ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                                            className="flex"
                                        >
                                            <Check size={13} strokeWidth={3} className="text-white" />
                                        </motion.span>
                                    </span>
                                    <div>
                                        <p
                                            className="text-sm font-medium transition-colors duration-300"
                                            style={{ color: done ? '#0F172A' : '#94A3B8' }}
                                        >
                                            {row.label}
                                        </p>
                                        {row.note && done && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600"
                                            >
                                                <ScanFace size={12} />
                                                {row.note}
                                            </motion.p>
                                        )}
                                    </div>
                                </div>
                                <motion.span
                                    key={done ? 'on' : 'off'}
                                    initial={done ? { opacity: 0, x: 6 } : false}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-sm font-semibold tabular-nums"
                                    style={{ color: done ? '#0F172A' : '#CBD5E1' }}
                                >
                                    {done ? row.time : '--:--'}
                                </motion.span>
                            </li>
                        )
                    })}
                </ul>

                {/* Hours */}
                <div className="mt-2 rounded-2xl bg-[#FBFAF7] p-4">
                    <div className="flex items-baseline justify-between">
                        <p className="text-xs font-medium text-slate-500">Hours today</p>
                        <p className="text-xl font-bold tabular-nums text-[#16305C]">
                            {hours.toFixed(2)}
                            <span className="ml-1 text-xs font-semibold text-slate-500">hrs</span>
                        </p>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${Math.min(100, (hours / 8) * 100)}%`,
                                backgroundColor: GOLD,
                            }}
                        />
                    </div>
                </div>
            </motion.div>

            {/* Floating chip: appears with the first punch */}
            <motion.div
                initial={false}
                animate={started ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 8 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="absolute -left-2 top-28 flex items-center gap-2 rounded-xl border border-[#16305C]/10 bg-white px-3 py-2 shadow-lg sm:-left-10"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <MapPin size={15} />
                </span>
                <span className="text-xs font-semibold text-slate-700">Inside geofence</span>
            </motion.div>

            {/* Floating chip: appears when the day completes */}
            <motion.div
                initial={false}
                animate={complete ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 8 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="absolute -bottom-5 -right-2 flex items-center gap-2 rounded-xl border border-[#16305C]/10 bg-white px-3 py-2 shadow-lg sm:-right-8"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D7A32E]/15 text-[#B8861B]">
                    <FileText size={15} />
                </span>
                <span className="text-xs font-semibold text-slate-700">Weekly report ready</span>
            </motion.div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const heroItem = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

function Hero() {
    return (
        <section className="relative overflow-hidden">
            {/* Background: dot grid + one soft navy block */}
            <div className="pointer-events-none absolute inset-0 -z-0">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(22,48,92,0.12) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                        maskImage: 'linear-gradient(to bottom, black 30%, transparent 95%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 95%)',
                    }}
                />
                <div className="absolute -right-48 -top-32 h-[560px] w-[560px] rotate-12 rounded-[96px] bg-[#16305C]/[0.05]" />
            </div>

            <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 px-6 py-16 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-28">
                <motion.div
                    initial="hidden"
                    animate="show"
                    transition={{ staggerChildren: 0.12 }}
                    className="lg:col-span-7"
                >
                    <motion.div
                        variants={heroItem}
                        className="inline-flex items-center gap-2 rounded-full border border-[#16305C]/10 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        <WifiOff size={14} className="text-[#16305C]" />
                        Works offline and syncs when you reconnect
                    </motion.div>

                    <motion.h1
                        variants={heroItem}
                        className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-[#16305C] sm:text-5xl lg:text-[3.5rem] text-balance"
                    >
                        Internship attendance you can verify.
                    </motion.h1>

                    <motion.p
                        variants={heroItem}
                        className="mt-6 max-w-xl text-lg leading-8 text-slate-600 text-pretty"
                    >
                        Intern links students, coordinators and supervisors in one place. Interns time in with
                        a face check, log their work by session, and hand over weekly reports that are ready
                        to sign.
                    </motion.p>

                    <motion.div variants={heroItem} className="mt-9 flex flex-wrap items-center gap-4">
                        <Link
                            to="/login"
                            className={`rounded-xl bg-[#16305C] px-8 py-3.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#0F2245] hover:shadow-lg active:translate-y-0 active:scale-95 ${focusRing}`}
                        >
                            Get started
                        </Link>
                        <a
                            href={APK_URL}
                            download="InternApp.apk"
                            className={`inline-flex items-center gap-2 rounded-xl border-2 border-[#16305C] bg-white/60 px-6 py-3 text-sm font-semibold text-[#16305C] transition hover:-translate-y-0.5 hover:bg-[#16305C] hover:text-white active:translate-y-0 active:scale-95 ${focusRing}`}
                        >
                            <Download size={16} />
                            Download Android app
                        </a>
                    </motion.div>
                </motion.div>

                <div className="lg:col-span-5">
                    <AttendancePreview />
                </div>
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

const ROLES = [
    {
        icon: GraduationCap,
        title: 'Students',
        body: 'Time in with a face check, add task notes and photos for each session, and keep your daily time record ready to export.',
    },
    {
        icon: Users,
        title: 'Coordinators',
        body: 'Follow attendance and rendered hours across your students without chasing paper logs.',
    },
    {
        icon: UserCheck,
        title: 'Supervisors',
        body: 'Review each intern’s weekly report and sign off on their hours.',
    },
]

function Roles() {
    return (
        <section className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
            <Reveal>
                <h2 className="max-w-xl text-3xl font-bold tracking-tight text-[#16305C] sm:text-4xl text-balance">
                    One record for everyone involved
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                    Everyone works from the same attendance data, so there’s nothing to reconcile at the end of
                    the term.
                </p>
            </Reveal>

            <div className="mt-12 grid border-y border-[#16305C]/10 md:grid-cols-3">
                {ROLES.map(({ icon: Icon, title, body }, i) => (
                    <Reveal
                        key={title}
                        delay={i * 0.1}
                        className={`py-8 md:px-8 md:py-10 ${i > 0 ? 'border-t border-[#16305C]/10 md:border-l md:border-t-0' : 'md:pl-0'
                            } ${i === ROLES.length - 1 ? 'md:pr-0' : ''}`}
                    >
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#16305C]/5 text-[#16305C]">
                            <Icon size={21} />
                        </span>
                        <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
                        <p className="mt-2 text-[15px] leading-7 text-slate-600">{body}</p>
                    </Reveal>
                ))}
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ */
/* Features                                                            */
/* ------------------------------------------------------------------ */

const FEATURES = [
    {
        icon: ScanFace,
        title: 'Face-verified time in',
        body: 'Each shift starts with a quick face check, so every recorded hour belongs to the right intern.',
    },
    {
        icon: MapPin,
        title: 'Location-aware punches',
        body: 'Time in requires being on site. Fieldwork is still recorded when interns are away, with a task note attached.',
    },
    {
        icon: WifiOff,
        title: 'Works without internet',
        body: 'Shifts are saved on the phone and uploaded from Reports once the connection is back.',
    },
    {
        icon: FileText,
        title: 'Reports ready to submit',
        body: 'Generate a weekly report with signature lines, or export the daily time record as PDF or CSV.',
    },
]

function Features() {
    return (
        <section id="features" className="scroll-mt-20 border-y border-[#16305C]/10 bg-white">
            <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-20 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-28">
                <Reveal className="lg:col-span-5">
                    <div className="lg:sticky lg:top-28">
                        <h2 className="text-3xl font-bold tracking-tight text-[#16305C] sm:text-4xl text-balance">
                            Everything an OJT record needs
                        </h2>
                        <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
                            From the first time in to the signed report, each step is captured where the work
                            happens.
                        </p>
                    </div>
                </Reveal>

                <ul className="lg:col-span-7">
                    {FEATURES.map(({ icon: Icon, title, body }, i) => (
                        <motion.li
                            key={title}
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                            className="group flex gap-5 border-t border-[#16305C]/10 py-7 first:border-t-0 first:pt-0"
                        >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#16305C]/5 text-[#16305C] transition-colors duration-300 group-hover:bg-[#16305C] group-hover:text-white">
                                <Icon size={22} />
                            </span>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                                <p className="mt-1.5 max-w-lg text-[15px] leading-7 text-slate-600">{body}</p>
                            </div>
                        </motion.li>
                    ))}
                </ul>
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ */
/* How it works (a real sequence, so the numbers are earned)           */
/* ------------------------------------------------------------------ */

const STEPS = [
    { title: 'Enroll your face', body: 'A one-time setup in the app, so time in can be verified.' },
    { title: 'Time in on site', body: 'Tap Time in. Your face and location are checked in seconds.' },
    { title: 'Log your work', body: 'Add a task note and photos for the morning and the afternoon.' },
    { title: 'Submit your report', body: 'Export the weekly report and send it to your supervisor to sign.' },
]

function HowItWorks() {
    return (
        <section
            id="how-it-works"
            className="mx-auto w-full max-w-7xl scroll-mt-20 px-6 py-20 lg:px-8 lg:py-28"
        >
            <Reveal>
                <h2 className="max-w-xl text-3xl font-bold tracking-tight text-[#16305C] sm:text-4xl text-balance">
                    From first day to final report
                </h2>
            </Reveal>

            <div className="relative mt-14">
                {/* Line draws itself as the section scrolls into view */}
                <div className="absolute left-5 right-5 top-5 hidden h-px bg-[#16305C]/15 md:block">
                    <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 1.4, ease: EASE }}
                        className="h-full origin-left"
                        style={{ backgroundColor: GOLD }}
                    />
                </div>

                <ol className="grid gap-10 md:grid-cols-4 md:gap-8">
                    {STEPS.map((step, i) => (
                        <motion.li
                            key={step.title}
                            initial={{ opacity: 0, y: 14 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ duration: 0.5, delay: 0.2 + i * 0.25, ease: EASE }}
                            className="relative flex gap-4 md:block"
                        >
                            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#16305C] bg-[#FBFAF7] text-sm font-bold text-[#16305C]">
                                {i + 1}
                            </span>
                            <div className="md:mt-6">
                                <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                                <p className="mt-1.5 text-[15px] leading-7 text-slate-600">{step.body}</p>
                            </div>
                        </motion.li>
                    ))}
                </ol>
            </div>
        </section>
    )
}

/* ------------------------------------------------------------------ */
/* Closing CTA                                                         */
/* ------------------------------------------------------------------ */

function ClosingCta() {
    return (
        <section className="mx-auto w-full max-w-7xl px-6 pb-20 lg:px-8 lg:pb-28">
            <Reveal>
                <div className="relative overflow-hidden rounded-3xl bg-[#16305C] px-8 py-14 sm:px-14 sm:py-16">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[28px] border-[#D7A32E]/25" />
                    <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/[0.04]" />

                    <div className="relative max-w-xl">
                        <ClipboardCheck size={28} className="text-[#D7A32E]" />
                        <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl text-balance">
                            Start tracking your hours today
                        </h2>
                        <p className="mt-4 text-base leading-7 text-slate-300">
                            Sign in on the web, or install the Android app to punch in from the field.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <Link
                                to="/login"
                                className="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[#16305C] shadow-md transition hover:-translate-y-0.5 hover:bg-slate-100 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A32E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16305C]"
                            >
                                Sign in
                            </Link>
                            <a
                                href={APK_URL}
                                download="InternApp.apk"
                                className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10 active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A32E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16305C]"
                            >
                                <Download size={16} />
                                Download Android app
                            </a>
                        </div>
                    </div>
                </div>
            </Reveal>
        </section>
    )
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
    return (
        <footer className="border-t border-[#16305C]/10 bg-white">
            <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row lg:px-8">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-[#16305C]">
                    <img src={OCCLogo} alt="" className="h-7 w-7 object-contain" />
                    OCC Intern
                </div>
                <p className="text-sm text-slate-500">
                    © {new Date().getFullYear()} OCC Intern. All rights reserved.
                </p>
            </div>
        </footer>
    )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function LandingPage() {
    return (
        // reducedMotion="user" turns off movement for people who ask their OS for less motion
        <MotionConfig reducedMotion="user">
            <div className="min-h-screen w-full overflow-x-hidden bg-[#FBFAF7] font-sans text-slate-900">
                <Nav />
                <main>
                    <Hero />
                    <Roles />
                    <Features />
                    <HowItWorks />
                    <ClosingCta />
                </main>
                <Footer />
            </div>
        </MotionConfig>
    )
}