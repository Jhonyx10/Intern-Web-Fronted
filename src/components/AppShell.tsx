import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import OCCLOGO from '@/assets/OCC logo.webp'
import { Calendar1Icon, UserIcon } from 'lucide-react'

type Role = 'super_admin' | 'supervisor' | 'dean' | 'program_head' | 'coordinator' | 'student'

type NavItem = {
  to: string
  label: string
  end: boolean
  icon: React.ElementType
  // If omitted, the item is visible to every role.
  roles?: Role[]
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', end: true, icon: DashboardIcon },
  { to: '/administrator', label: 'Administrators', end: false, icon: AdministratorIcon, roles: ['super_admin'] },
  { to: '/courses', label: 'Departments', end: false, icon: CoursesIcon, roles: ['super_admin'] },
  { to: '/companies/map', label: 'Companies', end: false, icon: MapIcon, roles: ['coordinator'] },
  { to: '/dean/coordinators', label: 'Coordinators', end: false, icon: AdministratorIcon, roles: ['dean'] },
  { to: '/dean/school-year-section', label: 'Year & Section', end: false, icon: Calendar1Icon, roles: ['dean'] },
  { to: '/dean/students', label: 'Students', end: false, icon: UserIcon, roles: ['dean'] },
]

const pageTitles: Array<{ path: string, title: string, end?: boolean }> = [
  { path: '/', title: 'Dashboard', end: true },
  { path: '/companies/map/add', title: 'Add Companies' },
  { path: '/companies/map', title: 'Locations' },
  { path: '/courses', title: 'Departments' },
  { path: '/administrator', title: 'Administrator' },
  { path: '/dean/school-year-section', title: 'Year & Section' },
  { path: '/dean/coordinators', title: 'Coordinators' },
  { path: '/dean/students', title: 'Students' },
]

function resolvePageTitle(pathname: string): string {
  for (const page of pageTitles) {
    if (page.end) {
      if (pathname === page.path) {
        return page.title
      }
      continue
    }

    if (pathname === page.path || pathname.startsWith(`${page.path}/`)) {
      return page.title
    }
  }

  return navItems.find((item) => item.to === pathname)?.label ?? 'Dashboard'
}

const SIDEBAR_KEY = 'occ-sidenav-open'
const SIDEBAR_EXPANDED = 256
const SIDEBAR_COLLAPSED = 76

export function AppShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY)
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen))
    } catch {
      // ignore storage failures
    }
  }, [sidebarOpen])

  useEffect(() => {
    if (!profileOpen) {
      return
    }

    function onPointerDown(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen])

  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'

  // Role-based navigation visibility.
  // Add a `roles` array to a nav item to restrict it; omit `roles` to show it to everyone.
  const userRole = user?.role?.name as Role | undefined

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || (userRole !== undefined && item.roles.includes(userRole))
  )

  const pageTitle = resolvePageTitle(location.pathname)

  return (
    <div className="flex min-h-screen">
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-[var(--color-line)] bg-[var(--color-surface)] backdrop-blur-xl"
      >
        <div className={`flex items-center pt-6 pb-5 ${sidebarOpen ? 'px-4' : 'justify-center px-2'}`}>
          <div className={`flex min-w-0 items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(11,110,79,0.9)]"
              title="OCC Intern"
            >
              <img src={OCCLOGO} />
            </div>
            <AnimatePresence initial={false}>
              {sidebarOpen ? (
                <motion.div
                  key="brand-text"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0"
                >
                  <p className="truncate text-[11px] font-semibold tracking-[0.22em] text-[var(--color-accent)] uppercase">
                    Internship
                  </p>
                  <h1 className="truncate text-base font-semibold tracking-tight">
                    {user?.role?.label} | {user?.course?.code}
                  </h1>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <nav className={`flex flex-1 flex-col gap-1 ${sidebarOpen ? 'px-3' : 'items-center px-2'}`}>
          <AnimatePresence initial={false}>
            {sidebarOpen ? (
              <motion.p
                key="nav-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 pb-2 text-[11px] font-semibold tracking-[0.16em] text-[var(--color-muted)] uppercase"
              >
                Navigate
              </motion.p>
            ) : null}
          </AnimatePresence>

          {visibleNavItems.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                [
                  'relative flex items-center rounded-xl text-sm font-medium transition-colors',
                  sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-2',
                  isActive
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-[var(--color-accent-soft)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                  <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 text-[var(--color-accent)] shadow-sm ring-1 ring-[var(--color-line)]">
                    <Icon />
                  </span>
                  <AnimatePresence initial={false}>
                    {sidebarOpen ? (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10 overflow-hidden whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className={`mb-3 ${sidebarOpen ? 'mx-3' : 'mx-2'}`}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`flex items-center rounded-xl border border-[var(--color-line)] bg-white/80 text-sm font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)] ${sidebarOpen ? 'w-full justify-between gap-3 px-3 py-2.5' : 'mx-auto grid h-10 w-10 place-items-center'
              }`}
          >
            {sidebarOpen ? (
              <>
                <span>Collapse</span>
                <PanelLeftCloseIcon />
              </>
            ) : (
              <PanelLeftOpenIcon />
            )}
          </motion.button>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-surface)]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <AnimatePresence mode="wait">
              <motion.h2
                key={pageTitle}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="min-w-0 truncate text-lg font-semibold tracking-tight text-[var(--color-ink)]"
              >
                {pageTitle}
              </motion.h2>
            </AnimatePresence>

            <div ref={profileMenuRef} className="relative shrink-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/70"
              >
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-white"
                  title={user?.name}
                >
                  {initials}
                </div>
                <div className="min-w-0 hidden text-left sm:block">
                  <p className="truncate text-sm font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-[var(--color-muted)]">{user?.role?.label}</p>
                </div>
                <span
                  className={`hidden text-[var(--color-muted)] transition-transform sm:block ${profileOpen ? 'rotate-180' : ''
                    }`}
                >
                  <ChevronDownIcon />
                </span>
              </motion.button>

              <AnimatePresence>
                {profileOpen ? (
                  <motion.div
                    key="profile-menu"
                    role="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                  >
                    <div className="border-b border-[var(--color-line)] px-3 py-2.5 sm:hidden">
                      <p className="truncate text-sm font-semibold">{user?.name}</p>
                      <p className="truncate text-xs text-[var(--color-muted)]">{user?.role?.label}</p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false)
                        void logout()
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-slate-50"
                    >
                      <LogoutIcon />
                      Log out
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-4 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}

function PanelLeftCloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2v12" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.5 6.5 8 8l1.5 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PanelLeftOpenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 2v12" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 6.5 9.5 8 8 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M3.5 5.25 7 8.75l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M7 2H4.5A1.5 1.5 0 0 0 3 3.5v9A1.5 1.5 0 0 0 4.5 14H7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 8h6m0 0-2-2m2 2-2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 3.2 5.8 1.8 10.2 3.2 14 1.8v11L10.2 14.2 5.8 12.8 2 14.2V3.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M5.8 1.8v11M10.2 3.2v11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function AdministratorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2 13.5c0-2.485 2.686-4.5 6-4.5s6 2.015 6 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CoursesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 4.5 8 2l6 2.5v.5c0 3.4-2.4 5.9-6 7-3.6-1.1-6-3.6-6-7V4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 2v11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
