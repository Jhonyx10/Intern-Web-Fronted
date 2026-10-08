import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, Outlet, useLocation, matchPath } from "react-router-dom";
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/context/ThemeContext'
import OCCLOGO from '@/assets/OCC logo.webp'
import { Calendar1Icon, UserIcon, Settings, BuildingIcon, FolderIcon, FolderCheckIcon, Building2Icon, History, CalendarDays, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import StudentLiveTracker from '@/pages/coordinator/StudentLiveTracker'
import CourseDetailsPage from '@/pages/details/CourseDetails';

type Role = 'super_admin' | 'supervisor' | 'dean' | 'admin' | 'coordinator' | 'student'

type SectionKey = 'overview' | 'academic' | 'people' | 'internship'

type NavItem = {
  to: string
  label: string
  end: boolean
  icon: React.ElementType
  section: SectionKey
  // If omitted, the item is visible to every role.
  roles?: Role[]
}

// Sidebar groups, in display order. A null label shows no heading.
const SECTIONS: { key: SectionKey; label: string | null }[] = [
  { key: 'overview', label: null },
  { key: 'academic', label: 'Academic' },
  { key: 'people', label: 'People' },
  { key: 'internship', label: 'Internship' },
]

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", end: true, icon: DashboardIcon, section: 'overview' },

  // Academic
  {
    to: "/school-year-section",
    label: "School Year",
    end: false,
    icon: Calendar1Icon,
    section: 'academic',
    roles: ["dean", "super_admin"],
  },
  {
    to: "/documents",
    label: "Documents",
    end: false,
    icon: FolderCheckIcon,
    section: 'academic',
    roles: ["super_admin", "dean", "coordinator"],
  },
  {
    to: "/courses",
    label: "Departments",
    end: false,
    icon: CoursesIcon,
    section: 'academic',
    roles: ["super_admin"],
  },
  {
    to: "/evaluation",
    label: "Evaluation",
    end: false,
    icon: FolderIcon,
    section: 'academic',
    roles: ["dean", "super_admin"],
  },
  {
    to: "/history",
    label: "History",
    end: false,
    icon: History,
    section: 'academic',
    roles:["dean", "coordinator"],
  },

  // People
  {
    to: "/administrator",
    label: "Administrators",
    end: false,
    icon: AdministratorIcon,
    section: 'people',
    roles: ["super_admin"],
  },
  {
    to: "/coordinators",
    label: "Coordinators",
    end: false,
    icon: AdministratorIcon,
    section: 'people',
    roles: ["dean"],
  },
  {
    to: "/coordinator/my-section",
    label: "My Section",
    end: true,
    icon: UserIcon,
    section: 'people',
    roles: ["coordinator"],
  },
  {
    to: "/students",
    label: "Students",
    end: false,
    icon: UserIcon,
    section: 'people',
    roles: ["dean", "super_admin"],
  },
  {
    to: "/supervisor/interns",
    label: "Interns",
    end: true,
    icon: UserIcon,
    section: 'people',
    roles: ["supervisor"],
  },

  // Internship
  {
    to: "/companies/map",
    label: "Organizations",
    end: false,
    icon: Building2Icon,
    section: 'internship',
    roles: ["coordinator", "dean"],
  },
  {
    to: "/companies",
    label: "Organizations",
    end: false,
    icon: Building2Icon,
    section: 'internship',
    roles: ["super_admin"],
  },
  {
    to: "/supervisor/company-info",
    label: "Organizations Info",
    end: true,
    icon: BuildingIcon,
    section: 'internship',
    roles: ["supervisor"],
  },
  {
    to: "/supervisor/attendance",
    label: "Attendance",
    end: true,
    icon: Calendar1Icon,
    section: 'internship',
    roles: ["supervisor"],
  },
  {
    to: "/student/live/location",
    label: "Interns Logs",
    end: true,
    icon: MapIcon,
    section: 'internship',
    roles: ["coordinator"],
  },
];

const pageTitles: Array<{ path: string; title: string; end?: boolean }> = [
  { path: "/dashboard", title: "Dashboard", end: true },
  { path: "/companies/map/add", title: "Add Companies" },
  { path: "/companies/map", title: "Organizations" },
  { path: "/courses", title: "Departments" },
  { path: "/administrator", title: "Administrator" },
  { path: "/documents", title: "Documents" },
  { path: "/coordinator/my-section", title: "My Section", end: true },
  { path: "/school-year-section", title: "Year & Section" },
  { path: "/coordinators", title: "Coordinators" },
  { path: "/students", title: "Students" },
  { path: "/history", title: "History Archive" },
  { path: "/school-year/:id", title: "School Year Details" },
  { path: "/supervisor/company-info", title: "Company Info", end: true },
  { path: "/supervisor/interns", title: "Interns", end: true },
  { path: "/supervisor/attendance", title: "Attendance", end: true },
  { path: "/settings", title: "Account & Department Settings", end: true },
  {
    path: "/student/live/location",
    title: "Interns Live Location",
    end: true,
  },
  {
    path: "/supervisor/interns/:internId/evaluations/:evaluationId",
    title: "Evaluation",
    end: true,
  },
  {
    path: "/course/details/:id",
    title: "Department Details",
    end: true,
  },
];

function resolvePageTitle(pathname: string): string {
  for (const page of pageTitles) {
    const matched = page.end
      ? matchPath({ path: page.path, end: true }, pathname)
      : matchPath({ path: page.path, end: false }, pathname);

    if (matched) {
      return page.title;
    }
  }

  return navItems.find((item) => item.to === pathname)?.label ?? "Dashboard";
}

const SIDEBAR_KEY = 'occ-sidenav-open'
const SIDEBAR_EXPANDED = 256
const SIDEBAR_COLLAPSED = 76
const LIVE_TRACKER_PATH = "/student/live/location";
const SCHOOL_YEAR_PATH = "/school-year-section";

export function AppShell() {
  const { user, logout } = useAuth()
  const { logoUrl, themeColor } = useTheme()
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
  const isOnLiveTracker = location.pathname === LIVE_TRACKER_PATH;
  const [hasVisitedLiveTracker, setHasVisitedLiveTracker] = useState(isOnLiveTracker);

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

  // Visible items grouped into their sidebar sections (empty sections are dropped)
  const groupedNav = useMemo(() => {
    const visible = navItems.filter(
      (item) => !item.roles || (userRole !== undefined && item.roles.includes(userRole))
    )
    return SECTIONS.map((section) => ({
      ...section,
      items: visible.filter((item) => item.section === section.key),
    })).filter((section) => section.items.length > 0)
  }, [userRole])

  // Super admin manages the list of school years; everyone else (e.g. dean)
  // goes straight to their own department, filtered to the current school year.
  const isSuperAdmin =
    userRole === 'super_admin' || (userRole as string | undefined) === 'superadmin'

  const showCurrentSchoolYear =
    location.pathname.replace(/\/$/, '') === SCHOOL_YEAR_PATH && !isSuperAdmin

  const pageTitle = showCurrentSchoolYear
    ? 'School Year'
    : resolvePageTitle(location.pathname)

  useEffect(() => {
    if (isOnLiveTracker) {
      setHasVisitedLiveTracker(true);
    }
  }, [isOnLiveTracker]);

  return (
    <div className="flex min-h-screen">
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{ backgroundColor: themeColor || 'var(--color-accent)' }}
        className="sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r border-[var(--color-line)] backdrop-blur-xl text-white"
      >
        <div className={`flex items-center pt-6 pb-5 ${sidebarOpen ? 'px-4' : 'justify-center px-2'}`}>
          <div className={`flex min-w-0 items-center w-full ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl overflow-hidden text-sm font-bold tracking-wide text-white shadow-[0_10px_24px_-12px_rgba(11,110,79,0.9)] bg-white p-1"
              title="OCC Intern"
            >
              <img
                src={logoUrl || OCCLOGO}
                alt="Logo"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = OCCLOGO
                }}
              />
            </div>
            <AnimatePresence initial={false}>
              {sidebarOpen ? (
                <motion.div
                  key="brand-text"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-[11px] font-semibold tracking-[0.22em] text-white/70 uppercase">
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

        <nav className={`flex flex-1 flex-col min-h-0 ${sidebarOpen ? 'px-3' : 'items-center px-2'}`}>
          <div className={`flex flex-col flex-1 overflow-y-auto min-h-0 pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent ${!sidebarOpen ? 'items-center w-full' : ''}`}>
            {groupedNav.map((group, groupIndex) => (
              <div
                key={group.key}
                className={`${groupIndex === 0 ? '' : 'mt-4'} ${!sidebarOpen ? 'flex w-full flex-col items-center' : ''}`}
              >
                {/* Section heading, or a thin divider when the sidebar is collapsed */}
                {sidebarOpen ? (
                  group.label ? (
                    <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-[0.16em] text-white/60 uppercase">
                      {group.label}
                    </p>
                  ) : null
                ) : groupIndex > 0 ? (
                  <div className="mb-3 h-px w-8 bg-white/20" />
                ) : null}

                <div className={`flex flex-col gap-1 ${!sidebarOpen ? 'items-center w-full' : ''}`}>
                  {group.items.map(({ to, label, end, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        [
                          'group relative flex items-center rounded-xl text-sm font-medium transition-colors shrink-0',
                          sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-2',
                          isActive
                            ? 'text-white'
                            : 'text-white/70 hover:text-white',
                        ].join(' ')
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? (
                            <motion.span
                              layoutId="nav-active"
                              className="absolute inset-0 rounded-xl bg-white/10"
                              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                          ) : null}
                          <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white shadow-sm ring-1 ring-white/10">
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
                            ) : (
                              <div
                                className="absolute left-full ml-3 hidden items-center whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold tracking-wide text-white opacity-0 shadow-lg transition-all delay-75 duration-200 group-hover:flex group-hover:opacity-100 z-50"
                                style={{ backgroundColor: themeColor || 'var(--color-accent)' }}
                              >
                                {label}
                              </div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[var(--color-surface)]/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSidebarOpen((open) => !open)}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--color-line)] bg-white text-[var(--color-muted)] shadow-sm transition-colors hover:bg-slate-50 hover:text-[var(--color-ink)]"
              >
                {sidebarOpen ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
              </motion.button>

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
            </div>

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
                    <NavLink
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2 border-b border-[var(--color-line)] px-3 py-2.5 text-left text-sm font-medium text-[var(--color-ink)] transition-colors hover:bg-slate-50"
                    >
                      <Settings size={16} />
                      Settings
                    </NavLink>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileOpen(false)
                        void logout()
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
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
            {!isOnLiveTracker && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {showCurrentSchoolYear ? <DeanCurrentCourse /> : <Outlet />}
                </motion.div>
              </AnimatePresence>
            )}

            {hasVisitedLiveTracker && (
              <div style={{ display: isOnLiveTracker ? 'block' : 'none' }}>
                <StudentLiveTracker />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// Dean landing page for "School Year": their own department's details,
// filtered to the current school year (no school year list, no program cards).
function DeanCurrentCourse() {
  const { token, user } = useAuth()
  const courseId =
    user?.course?.id ?? (user as unknown as { course_id?: number } | null)?.course_id

  const { data: currentYear, isLoading, isError } = useQuery({
    queryKey: [...queryKeys.schoolYears.all, 'current'],
    queryFn: () => apiRequest<{ id: number }>('/school-years/current', { token }),
    enabled: Boolean(token),
    retry: false, // a 404 means no active school year
  })

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-accent)]" size={28} />
      </div>
    )
  }

  if (!courseId) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-[var(--color-line)] p-8 text-center text-sm text-[var(--color-muted)]">
        Your account is not assigned to a department yet.
      </div>
    )
  }

  if (isError || !currentYear) {
    return (
      <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line)] py-24 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <CalendarDays size={24} />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-[var(--color-ink)]">
          No Current School Year
        </h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          The Super Admin has not set an active school year yet. Once they do,
          your department will show up here.
        </p>
      </section>
    )
  }

  return <CourseDetailsPage courseId={courseId} schoolYearId={currentYear.id} embedded />
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