import { useAuth } from '@/lib/auth'
import { useCompanies } from '@/lib/queries/companies'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

function polygonStatus(company: {
  geofence_enabled: boolean
  geofence_polygon: { type: string } | null
}): string {
  if (!company.geofence_enabled) {
    return 'Disabled'
  }

  if (company.geofence_polygon?.type === 'Polygon') {
    return 'Polygon set'
  }

  return 'No polygon'
}

export function CompaniesMapPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: companies = [], isPending: loading, error: companiesError } = useCompanies()
  const error =
    companiesError instanceof Error
      ? companiesError.message
      : companiesError
        ? 'Failed to load companies.'
        : null

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Companies</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted)]">
            Host companies available for intern placements.
          </p>
        </div>
        {user?.role?.name === 'coordinator' ? (
          <button
            type="button"
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
            onClick={() => navigate('/companies/map/add')}
          >
            Company requests
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--color-muted)]">Loading companies…</p> : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--color-line)] bg-slate-50/80 text-[11px] font-semibold tracking-[0.12em] text-[var(--color-muted)] uppercase">
              <tr>
                <th className="px-4 py-3">Company name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Polygon status</th>
                <th className="px-4 py-3">Contact person</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[var(--color-muted)]">
                    No companies yet.
                  </td>
                </tr>
              ) : null}
              {companies.map((company) => {
                const status = polygonStatus(company)

                return (
                  <tr
                    key={company.id}
                    className="border-b border-[var(--color-line)] last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                      {company.name}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-[var(--color-muted)]">
                      {company.address ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                          status === 'Polygon set'
                            ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                            : status === 'Disabled'
                              ? 'bg-slate-100 text-[var(--color-muted)]'
                              : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink)]">
                      {company.contact_person ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {company.contact_email ? (
                          <a
                            href={`mailto:${company.contact_email}`}
                            className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                          >
                            Email
                          </a>
                        ) : null}
                          <Link
                            to={`/companies/${company.id}`}
                            className="rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                          >
                            View
                          </Link>
                        {!company.contact_email && !company.contact_phone ? (
                          <span className="text-xs text-[var(--color-muted)]">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
