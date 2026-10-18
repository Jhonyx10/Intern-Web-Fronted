import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useNotificationCenter, type AppNotification } from '@/hooks/useNotificationCenter'

export default function NotificationBell() {
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotificationCenter()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape (same behaviour as the profile menu)
  useEffect(() => {
    if (!open) return

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleItemClick(n: AppNotification) {
    if (!n.read_at) markRead.mutate(n.id)
    if (n.link) {
      setOpen(false)
      navigate(n.link)
    }
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-muted)] shadow-sm transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]"
      >
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="notification-panel"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2.5">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Notifications</p>
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={unreadCount === 0 || markAllRead.isPending}
                className="flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-[var(--color-accent)]" size={20} />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <Bell size={18} />
                  </div>
                  <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">You're all caught up</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">No notifications yet.</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((n) => {
                    const unread = !n.read_at
                    return (
                      <li key={n.id} className="border-b border-[var(--color-line)] last:border-b-0">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleItemClick(n)}
                          className={`flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-slate-50 ${
                            unread ? 'bg-[var(--color-accent-soft)]/40' : ''
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              unread ? 'bg-[var(--color-accent)]' : 'bg-transparent'
                            }`}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-sm ${
                                unread ? 'font-semibold' : 'font-medium'
                              } text-[var(--color-ink)]`}
                            >
                              {n.title}
                            </span>
                            {n.message ? (
                              <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--color-muted)]">
                                {n.message}
                              </span>
                            ) : null}
                            <span className="mt-1 block text-[11px] text-[var(--color-muted)]">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}