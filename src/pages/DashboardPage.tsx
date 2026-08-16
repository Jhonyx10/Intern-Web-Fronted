import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
}

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <motion.section variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={item} className="max-w-2xl">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
          Overview
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome, {user?.name}
        </h2>
        <p className="mt-3 text-[var(--color-muted)] leading-relaxed">
          {user?.course?.name}
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        <motion.article
          variants={item}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M3.5 15c.8-2.4 2.7-3.6 5.5-3.6s4.7 1.2 5.5 3.6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Your role</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {user?.role?.label ?? 'Unknown'}
          </p>
        </motion.article>

        <motion.article
          variants={item}
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-6 shadow-[var(--shadow-soft)] backdrop-blur"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M9 16s5.5-4.1 5.5-8.2A5.5 5.5 0 0 0 9 2.3a5.5 5.5 0 0 0-5.5 5.5C3.5 11.9 9 16 9 16Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="9" cy="7.8" r="1.8" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Companies map</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Mapbox view of partner company locations and geofence previews.
          </p>
          <Link
            to="/companies/map"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
          >
            Open map
            <span aria-hidden>→</span>
          </Link>
        </motion.article>
      </div>
    </motion.section>
  )
}
