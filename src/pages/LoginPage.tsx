import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('superadmin@gmail.com')
  const [password, setPassword] = useState('sadmin123')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to log in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[var(--color-accent)]/15 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-slate-400/20 blur-3xl" />
      </div>

      <motion.form
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        onSubmit={(event) => void onSubmit(event)}
        className="relative w-full max-w-md rounded-3xl border border-[var(--color-line)] bg-white/85 p-8 shadow-[var(--shadow-soft)] backdrop-blur-xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--color-accent)] text-sm font-bold text-white">
            OCC
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
              Intern
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Staff sign in</h1>
          </div>
        </div>

        <p className="text-sm text-[var(--color-muted)] leading-relaxed">
          Sanctum token auth against the Laravel API. No Inertia, no Breeze.
        </p>

        <label className="mt-7 block text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
            required
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 outline-none transition focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)]"
            required
          />
        </label>

        {error ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-red-600"
          >
            {error}
          </motion.p>
        ) : null}

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: submitting ? 1 : 1.01 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
          className="mt-7 w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 font-semibold text-white shadow-[0_14px_28px_-16px_rgba(11,110,79,0.9)] transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </motion.button>
      </motion.form>
    </div>
  )
}
