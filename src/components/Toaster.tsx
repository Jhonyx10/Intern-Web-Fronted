import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export type ToastItem = {
  id: string
  type: ToastType
  message: string
  description?: string
}

type ToastContextValue = {
  toasts: ToastItem[]
  addToast: (type: ToastType, message: string, description?: string) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)
const DEFAULT_DURATION = 4000

// Module-level ref so `toast.success(...)` works outside React components too
// (e.g. inside a plain async function, not just inside a mutation's onError).
let externalAddToast: ToastContextValue['addToast'] | null = null

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const addToast = useCallback(
    (type: ToastType, message: string, description?: string) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, type, message, description }])
      timers.current.set(id, setTimeout(() => removeToast(id), DEFAULT_DURATION))
      return id
    },
    [removeToast]
  )

  useEffect(() => {
    externalAddToast = addToast
    return () => {
      externalAddToast = null
    }
  }, [addToast])

  useEffect(() => {
    const timersMap = timers.current
    return () => {
      timersMap.forEach((timer) => clearTimeout(timer))
      timersMap.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

// Standalone API — call from anywhere (mutation onError, plain utils, etc.)
// without needing to be inside a component that calls useToast().
export const toast = {
  success: (message: string, description?: string) => externalAddToast?.('success', message, description),
  error: (message: string, description?: string) => externalAddToast?.('error', message, description),
  info: (message: string, description?: string) => externalAddToast?.('info', message, description),
}

const toastVariants: Variants = {
  hidden: { opacity: 0, y: -12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.18 } },
}

const ICONS: Record<ToastType, typeof CheckCircle2> = { success: CheckCircle2, error: XCircle, info: Info }
const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-600',
  error: 'text-red-500',
  info: 'text-[var(--color-accent)]',
}
const BORDER_COLORS: Record<ToastType, string> = {
  success: 'border-emerald-100',
  error: 'border-red-100',
  info: 'border-[var(--color-line)]',
}

function Toaster() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const Icon = ICONS[item.type]
          return (
            <motion.div
              key={item.id}
              layout
              variants={toastVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className={[
                'pointer-events-auto flex items-start gap-2.5 rounded-2xl border bg-white px-4 py-3 shadow-[var(--shadow-soft)]',
                BORDER_COLORS[item.type],
              ].join(' ')}
            >
              <Icon size={18} className={['mt-0.5 shrink-0', ICON_COLORS[item.type]].join(' ')} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--color-ink)]">{item.message}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                aria-label="Dismiss"
                className="shrink-0 rounded-lg p-1 text-[var(--color-muted)] transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]"
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}