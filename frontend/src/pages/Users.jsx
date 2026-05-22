import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Spinner, Badge, Alert, EmptyState } from '../components/UI'
import CreateUserModal from '../components/CreateUserModal'

const ROLE_LABELS = {
  student: 'Student Intern',
  workplace_supervisor: 'Workplace Supervisor',
  academic_supervisor: 'Academic Supervisor',
  admin: 'Administrator',
}

/** An inactive workplace_supervisor who has never been activated = pending approval. */
const isPendingApproval = (u) => !u.is_active && u.role === 'workplace_supervisor'


export default function Users() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [toggling, setToggling] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Route-level RoleRoute in App.jsx handles the primary redirect.
  // This is a secondary safety net for edge-cases (e.g. role changed mid-session).
  if (user?.role !== 'admin' && !user?.is_staff) {
    return (
      <div className="page-body">
        <div className="alert alert-error">
          Access denied — administrators only.
        </div>
      </div>
    )
  }

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterRole) params.role = filterRole
      if (search) params.search = search
      const { data } = await api.get('/auth/users/', { params })
      setUsers(data.results || data)
    } catch { setError('Failed to load users.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterRole, search])

  const toggleActive = async (u) => {
    setToggling(u.id)
    try {
      const { data } = await api.patch(`/auth/users/${u.id}/`, { is_active: !u.is_active })
      setUsers(prev => prev.map(x => x.id === data.id ? data : x))
    } catch { alert('Failed to update user.') }
    finally { setToggling(null) }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Manage Users</h1>
          <p className="text-secondary">{users.length} user{users.length !== 1 ? 's' : ''} found</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Add New User
        </button>
      </div>

      {/* Pending approval banner */}
      {(() => {
        const pending = users.filter(isPendingApproval)
        if (!pending.length) return null
        return (
          <div className="alert alert-warning" style={{ marginBottom: 20, alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              <strong>{pending.length} Workplace Supervisor{pending.length > 1 ? 's' : ''}</strong> {pending.length > 1 ? 'are' : 'is'} awaiting admin approval.
              Review and approve them below.
            </span>
          </div>
        )
      })()}

      {error && <Alert type="error">{error}</Alert>}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); load(); }}
        />
      )}

      <div className="filters-bar">
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <form onSubmit={handleSearch} className="flex" style={{ gap: 8 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by name or email…"
            style={{ minWidth: 240 }}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
          {search && <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setSearchInput('') }}>Clear</button>}
        </form>
      </div>

      {loading ? <Spinner /> : users.length === 0 ? (
        <EmptyState title="No users found" description="No users match your filter criteria." />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Student ID / Org</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 32, height: 32, background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                        {((u.first_name?.[0] || '') + (u.last_name?.[0] || '')).toUpperCase() || u.username?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-semibold">{u.first_name} {u.last_name}</span>
                    </div>
                  </td>
                  <td className="text-secondary text-sm">{u.username}</td>
                  <td className="text-secondary text-sm">{u.email || '—'}</td>
                  <td><span className="badge badge-draft">{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td className="text-secondary text-sm">
                    {u.student_id || u.organization || u.department || '—'}
                  </td>
                  <td className="text-secondary text-sm">
                    {new Date(u.date_joined).toLocaleDateString()}
                  </td>
                  <td>
                    {isPendingApproval(u) ? (
                      <span className="badge badge-pending">Pending Approval</span>
                    ) : (
                      <Badge status={u.is_active ? 'active' : 'cancelled'} />
                    )}
                  </td>
                  <td>
                    {isPendingApproval(u) ? (
                      <button
                        className="btn btn-success btn-sm"
                        disabled={toggling === u.id}
                        onClick={() => toggleActive(u)}
                        title="Approve this supervisor's account"
                      >
                        {toggling === u.id ? '…' : '✓ Approve'}
                      </button>
                    ) : (
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                        disabled={toggling === u.id || u.id === user.id}
                        onClick={() => toggleActive(u)}
                      >
                        {toggling === u.id ? '…' : u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
