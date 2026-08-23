import { useAuth } from '@/lib/auth'
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard'
import { DeanDashboard } from '@/components/dashboard/DeanDashboard'
import { ProgramHeadDashboard } from '@/components/dashboard/ProgramHeadDashboard'
import { CoordinatorDashboard } from '@/components/dashboard/CoordinatorDashboard'
import { SupervisorDashboard } from '@/components/dashboard/SupervisorDashboard'

export function DashboardPage() {
  const { user } = useAuth()
  const role = user?.role?.name

  if (role === 'super_admin') {
    return <SuperAdminDashboard />
  }

  if (role === 'dean') {
    return <DeanDashboard />
  }

  if (role === 'program_head') {
    return <ProgramHeadDashboard />
  }

  if (role === 'coordinator') {
    return <CoordinatorDashboard />
  }

  if (role === 'supervisor') {
    return <SupervisorDashboard />
  }

  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-2xl border border-[var(--color-line)] bg-white p-8 shadow-[var(--shadow-soft)] max-w-md">
        <h2 className="text-2xl font-bold text-[var(--color-ink)]">Welcome, {user?.name}</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          You are logged in as <span className="font-semibold text-[var(--color-ink)]">{user?.role?.label ?? 'User'}</span>.
        </p>
      </div>
    </div>
  )
}

