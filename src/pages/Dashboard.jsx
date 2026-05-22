import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Spinner, Badge } from '../components/UI'

const StatCard = ({ icon, label, value, colorClass }) => (
  <div className="stat-card">
    <div className={`stat-icon ${colorClass}`}>{icon}</div>
    <div className="stat-info">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
)

const icons = {
  placements: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  logs: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>,
  pending: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  score: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  check: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!data) return <p className="text-secondary">Failed to load dashboard.</p>

  const s = data.stats || {}

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.first_name || user?.username}!</h1>
          <p className="text-secondary">{new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Student Dashboard */}
      {data.role === 'student' && (
        <>
          <div className="stat-grid">
            <StatCard icon={icons.placements} label="Total Placements" value={s.total_placements} colorClass="blue" />
            <StatCard icon={icons.logs} label="Weekly Logs" value={s.total_logs} colorClass="green" />
            <StatCard icon={icons.pending} label="Pending Review" value={s.submitted_logs} colorClass="yellow" />
            <StatCard icon={icons.score} label="Avg Score" value={s.average_score ? `${s.average_score}%` : '—'} colorClass="cyan" />
          </div>

          {s.active_placement && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Active Placement</h3>
                <Badge status="active" />
              </div>
              <div className="card-body">
                <p className="font-semibold">{s.active_org}</p>
                <p className="text-secondary text-sm mt-1">
                  <Link to="/placements" className="auth-link">View placement details →</Link>
                </p>
              </div>
            </div>
          )}

          {data.recent_logs?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recent Logs</h3>
                <Link to="/logbook" className="btn btn-secondary btn-sm">View all</Link>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>Week</th><th>Status</th><th>Updated</th></tr></thead>
                  <tbody>
                    {data.recent_logs.map(log => (
                      <tr key={log.id}>
                        <td>Week {log.week_number}</td>
                        <td><Badge status={log.status} /></td>
                        <td className="text-secondary text-sm">{new Date(log.updated_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Supervisor Dashboard */}
      {(data.role === 'workplace_supervisor' || data.role === 'academic_supervisor') && (
        <>
          <div className="stat-grid">
            <StatCard icon={icons.placements} label="Assigned Placements" value={s.total_placements} colorClass="blue" />
            <StatCard icon={icons.check} label="Active" value={s.active_placements} colorClass="green" />
            <StatCard icon={icons.pending} label="Pending Reviews" value={s.pending_reviews} colorClass="yellow" />
            <StatCard icon={icons.score} label="Evaluations Submitted" value={s.submitted_evaluations} colorClass="cyan" />
          </div>

          {data.pending_logs?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Logs Awaiting Review</h3>
                <Link to="/logbook" className="btn btn-secondary btn-sm">View all</Link>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>Student</th><th>Week</th><th>Status</th><th>Submitted</th></tr></thead>
                  <tbody>
                    {data.pending_logs.map(log => (
                      <tr key={log.id}>
                        <td>{log.student__first_name} {log.student__last_name}</td>
                        <td>Week {log.week_number}</td>
                        <td><Badge status={log.status} /></td>
                        <td className="text-secondary text-sm">{log.submitted_at ? new Date(log.submitted_at).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Admin Dashboard */}
      {data.role === 'admin' && (
        <>
          <div className="stat-grid">
            <StatCard icon={icons.users} label="Students" value={s.total_students} colorClass="blue" />
            <StatCard icon={icons.placements} label="Active Placements" value={s.active_placements} colorClass="green" />
            <StatCard icon={icons.pending} label="Pending Reviews" value={s.pending_reviews} colorClass="yellow" />
            <StatCard icon={icons.score} label="Avg Score" value={s.average_score ? `${s.average_score}%` : '—'} colorClass="cyan" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">Placement Status</h3></div>
              <div className="card-body">
                {data.placement_status_breakdown?.map(item => (
                  <div key={item.status} className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                    <Badge status={item.status} />
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Log Status</h3></div>
              <div className="card-body">
                {data.log_status_breakdown?.map(item => (
                  <div key={item.status} className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                    <Badge status={item.status} />
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.recent_placements?.length > 0 && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Recent Placements</h3>
                <Link to="/placements" className="btn btn-secondary btn-sm">View all</Link>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead><tr><th>Student</th><th>Organization</th><th>Start</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.recent_placements.map(p => (
                      <tr key={p.id}>
                        <td>{p.student__first_name} {p.student__last_name}</td>
                        <td>{p.organization}</td>
                        <td className="text-secondary text-sm">{new Date(p.start_date).toLocaleDateString()}</td>
                        <td><Badge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
