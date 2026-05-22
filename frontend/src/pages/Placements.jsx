import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Spinner, Badge, Modal, Alert, EmptyState, ConfirmModal } from '../components/UI'

const initialForm = {
  student: '', organization: '', department: '', address: '',
  start_date: '', end_date: '', description: '',
  workplace_supervisor: '', academic_supervisor: '',
}

export default function Placements() {
  const { user } = useAuth()
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [students, setStudents] = useState([])
  const [supervisors, setSupervisors] = useState([])
  const [filterStatus, setFilterStatus] = useState('')

  const isAdmin = user?.role === 'admin'
  const isStudent = user?.role === 'student'

  const load = async () => {
    setLoading(true)
    try {
      const params = filterStatus ? { status: filterStatus } : {}
      const { data } = await api.get('/placements/', { params })
      setPlacements(data.results || data)
    } catch { setError('Failed to load placements.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  useEffect(() => {
    if (isAdmin) {
      api.get('/auth/students/').then(r => setStudents(r.data)).catch(() => {})
    }
    api.get('/auth/supervisors/').then(r => setSupervisors(r.data)).catch(() => {})
  }, [isAdmin])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...initialForm, ...(isStudent ? { student: user.id } : {}) })
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      student: p.student || '',
      organization: p.organization || '',
      department: p.department || '',
      address: p.address || '',
      start_date: p.start_date || '',
      end_date: p.end_date || '',
      description: p.description || '',
      workplace_supervisor: p.workplace_supervisor || '',
      academic_supervisor: p.academic_supervisor || '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (formErrors[e.target.name]) setFormErrors({ ...formErrors, [e.target.name]: null })
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormErrors({})
    try {
      const payload = { ...form }
      if (!payload.workplace_supervisor) delete payload.workplace_supervisor
      if (!payload.academic_supervisor) delete payload.academic_supervisor
      if (isStudent) { payload.student = user.id }

      if (editing) {
        const { data } = await api.patch(`/placements/${editing.id}/`, payload)
        setPlacements(prev => prev.map(p => p.id === data.id ? data : p))
      } else {
        const { data } = await api.post('/placements/', payload)
        setPlacements(prev => [data, ...prev])
      }
      setShowModal(false)
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') setFormErrors(d)
      else setFormErrors({ non_field_errors: ['Save failed. Check your input.'] })
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/placements/${confirmDelete.id}/`)
      setPlacements(prev => prev.filter(p => p.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Delete failed.')
    } finally { setDeleting(false) }
  }

  const updateStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/placements/${id}/status/`, { status })
      setPlacements(prev => prev.map(p => p.id === id ? data : p))
    } catch (err) { alert(err.response?.data?.detail || 'Status update failed.') }
  }

  const wpSupervisors = supervisors.filter(s => s.role === 'workplace_supervisor')
  const acSupervisors = supervisors.filter(s => s.role === 'academic_supervisor')
  const errFor = (f) => formErrors[f]?.[0] || formErrors[f]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Placements</h1>
          <p className="text-secondary">Internship placement records</p>
        </div>
        {(isAdmin || isStudent) && (
          <button className="btn btn-primary" onClick={openCreate}>
            + New Placement
          </button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="filters-bar">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <Spinner /> : placements.length === 0 ? (
        <EmptyState title="No placements found" description="No internship placements have been recorded yet." action={isAdmin || isStudent ? <button className="btn btn-primary" onClick={openCreate}>Create Placement</button> : null} />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {isAdmin && <th>Student</th>}
                <th>Organization</th>
                <th>Supervisor</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {placements.map(p => (
                <tr key={p.id}>
                  {isAdmin && (
                    <td>
                      <div className="font-semibold">{p.student_detail?.full_name || '—'}</div>
                    </td>
                  )}
                  <td>
                    <div className="font-semibold">{p.organization}</div>
                    {p.department && <div className="text-secondary text-sm">{p.department}</div>}
                  </td>
                  <td>
                    {p.workplace_supervisor_detail?.full_name && (
                      <div className="text-sm">{p.workplace_supervisor_detail.full_name}</div>
                    )}
                    {p.academic_supervisor_detail?.full_name && (
                      <div className="text-secondary text-sm">{p.academic_supervisor_detail.full_name}</div>
                    )}
                    {!p.workplace_supervisor_detail && !p.academic_supervisor_detail && <span className="text-muted">—</span>}
                  </td>
                  <td className="text-sm">{p.start_date}</td>
                  <td className="text-sm">{p.end_date}</td>
                  <td className="text-sm">{p.duration_weeks}w</td>
                  <td><Badge status={p.status} /></td>
                  <td>
                    <div className="table-actions">
                      {(p.status === 'draft' || isAdmin) && (
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                      )}
                      {isAdmin && (
                        <select
                          value={p.status}
                          onChange={e => updateStatus(p.id, e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '0.8rem', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
                        >
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      )}
                      {(isAdmin || (isStudent && p.status === 'draft')) && (
                        <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Placement' : 'New Placement'} size="modal-lg">
        <form onSubmit={save}>
          <div className="modal-body">
            {errFor('non_field_errors') && <Alert type="error">{errFor('non_field_errors')}</Alert>}

            {isAdmin && !editing && (
              <div className="form-group">
                <label>Student *</label>
                <select name="student" value={form.student} onChange={handleChange} required className={errFor('student') ? 'error' : ''}>
                  <option value="">— Select Student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                {errFor('student') && <span className="form-error">{errFor('student')}</span>}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Organization *</label>
                <input name="organization" value={form.organization} onChange={handleChange} placeholder="Company/Organization name" required className={errFor('organization') ? 'error' : ''} />
                {errFor('organization') && <span className="form-error">{errFor('organization')}</span>}
              </div>
              <div className="form-group">
                <label>Department</label>
                <input name="department" value={form.department} onChange={handleChange} placeholder="Department (optional)" />
              </div>
            </div>

            <div className="form-group">
              <label>Address</label>
              <input name="address" value={form.address} onChange={handleChange} placeholder="Physical address" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required className={errFor('start_date') ? 'error' : ''} />
                {errFor('start_date') && <span className="form-error">{errFor('start_date')}</span>}
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input name="end_date" type="date" value={form.end_date} onChange={handleChange} required className={errFor('end_date') ? 'error' : ''} />
                {errFor('end_date') && <span className="form-error">{errFor('end_date')}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Workplace Supervisor</label>
                <select name="workplace_supervisor" value={form.workplace_supervisor} onChange={handleChange}>
                  <option value="">— Select (optional) —</option>
                  {wpSupervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Academic Supervisor</label>
                <select name="academic_supervisor" value={form.academic_supervisor} onChange={handleChange}>
                  <option value="">— Select (optional) —</option>
                  {acSupervisors.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} placeholder="Brief description of the internship role..." rows={3} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Placement' : 'Create Placement'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={`Delete placement at "${confirmDelete?.organization}"? This cannot be undone.`}
      />
    </div>
  )
}
