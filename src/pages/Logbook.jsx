import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Spinner, Badge, Modal, Alert, EmptyState } from '../components/UI'

const initialForm = {
  placement: '', week_number: '', activities: '',
  challenges: '', learnings: '', objectives_next_week: '',
}

const TRANSITION_LABELS = {
  submitted: { label: 'Submit for Review', cls: 'btn-primary' },
  reviewed: { label: 'Mark as Reviewed', cls: 'btn-warning' },
  approved: { label: 'Approve', cls: 'btn-success' },
  rejected: { label: 'Reject', cls: 'btn-danger' },
  draft: { label: 'Return to Draft', cls: 'btn-secondary' },
}

export default function Logbook() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [placements, setPlacements] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [viewLog, setViewLog] = useState(null)
  const [transitioning, setTransitioning] = useState(null)
  const [transitionNote, setTransitionNote] = useState('')
  const [transitionComments, setTransitionComments] = useState('')

  const isStudent = user?.role === 'student'
  const isSupervisor = user?.role === 'workplace_supervisor' || user?.role === 'academic_supervisor'
  const isAdmin = user?.role === 'admin'

  const load = async () => {
    setLoading(true)
    try {
      const params = filterStatus ? { status: filterStatus } : {}
      const { data } = await api.get('/logs/', { params })
      setLogs(data.results || data)
    } catch { setError('Failed to load logbook entries.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterStatus])

  useEffect(() => {
    if (isStudent) {
      api.get('/placements/').then(r => {
        const list = r.data.results || r.data
        setPlacements(list.filter(p => p.status === 'active'))
      }).catch(() => {})
    }
  }, [isStudent])

  const openCreate = () => {
    setEditing(null)
    setForm(initialForm)
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (log) => {
    setEditing(log)
    setForm({
      placement: log.placement || '',
      week_number: log.week_number || '',
      activities: log.activities || '',
      challenges: log.challenges || '',
      learnings: log.learnings || '',
      objectives_next_week: log.objectives_next_week || '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormErrors({})
    try {
      if (editing) {
        const { data } = await api.patch(`/logs/${editing.id}/`, form)
        setLogs(prev => prev.map(l => l.id === data.id ? data : l))
      } else {
        const { data } = await api.post('/logs/', form)
        setLogs(prev => [data, ...prev])
      }
      setShowModal(false)
    } catch (err) {
      const d = err.response?.data
      if (d && typeof d === 'object') setFormErrors(d)
      else setFormErrors({ non_field_errors: ['Save failed.'] })
    } finally { setSaving(false) }
  }

  const doTransition = async (logId, newStatus) => {
    setTransitioning(logId + newStatus)
    try {
      const { data } = await api.post(`/logs/${logId}/transition/`, {
        status: newStatus,
        note: transitionNote,
        comments: transitionComments,
      })
      setLogs(prev => prev.map(l => l.id === data.id ? data : l))
      if (viewLog?.id === data.id) setViewLog(data)
      setTransitionNote('')
      setTransitionComments('')
    } catch (err) {
      alert(err.response?.data?.detail || 'Transition failed.')
    } finally { setTransitioning(null) }
  }

  const errFor = (f) => formErrors[f]?.[0] || formErrors[f]

  const canTransition = (log, ts) => {
    if (log.allowed_transitions?.includes(ts)) {
      if (ts === 'submitted') return isStudent
      if (['reviewed', 'approved', 'rejected'].includes(ts)) return isSupervisor || isAdmin
      if (ts === 'draft') return isStudent || isAdmin
    }
    return false
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Weekly Logbook</h1>
          <p className="text-secondary">Internship activity logs and reviews</p>
        </div>
        {isStudent && (
          <button className="btn btn-primary" onClick={openCreate}>+ New Log Entry</button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="filters-bar">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState title="No log entries found" description={isStudent ? "Start by creating your first weekly log." : "No logs assigned for review."} action={isStudent ? <button className="btn btn-primary" onClick={openCreate}>Create First Log</button> : null} />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {!isStudent && <th>Student</th>}
                <th>Week #</th>
                <th>Activities (preview)</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  {!isStudent && <td>{log.student_detail?.full_name || '—'}</td>}
                  <td><strong>Week {log.week_number}</strong></td>
                  <td className="text-secondary text-sm" style={{ maxWidth: 280 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {log.activities}
                    </span>
                  </td>
                  <td><Badge status={log.status} /></td>
                  <td className="text-sm text-secondary">{log.submitted_at ? new Date(log.submitted_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setViewLog(log)}>View</button>
                      {log.can_edit && isStudent && (
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(log)}>Edit</button>
                      )}
                      {log.allowed_transitions?.includes('submitted') && isStudent && (
                        <button className="btn btn-primary btn-sm" disabled={transitioning} onClick={() => doTransition(log.id, 'submitted')}>Submit</button>
                      )}
                      {log.allowed_transitions?.includes('reviewed') && isSupervisor && (
                        <button className="btn btn-warning btn-sm" disabled={transitioning} onClick={() => { setViewLog(log) }}>Review</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? `Edit Week ${editing.week_number} Log` : 'New Weekly Log Entry'} size="modal-lg">
        <form onSubmit={save}>
          <div className="modal-body">
            {errFor('non_field_errors') && <Alert type="error">{errFor('non_field_errors')}</Alert>}

            <div className="form-row">
              <div className="form-group">
                <label>Placement *</label>
                <select name="placement" value={form.placement} onChange={handleChange} required disabled={!!editing} className={errFor('placement') ? 'error' : ''}>
                  <option value="">— Select Placement —</option>
                  {placements.map(p => <option key={p.id} value={p.id}>{p.organization}</option>)}
                </select>
                {errFor('placement') && <span className="form-error">{errFor('placement')}</span>}
              </div>
              <div className="form-group">
                <label>Week Number *</label>
                <input name="week_number" type="number" min="1" max="52" value={form.week_number} onChange={handleChange} required disabled={!!editing} placeholder="e.g. 1" className={errFor('week_number') ? 'error' : ''} />
                {errFor('week_number') && <span className="form-error">{errFor('week_number')}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Activities Performed *</label>
              <textarea name="activities" value={form.activities} onChange={handleChange} rows={4} required placeholder="Describe the activities you performed this week..." className={errFor('activities') ? 'error' : ''} />
              {errFor('activities') && <span className="form-error">{errFor('activities')}</span>}
            </div>

            <div className="form-group">
              <label>Challenges Faced</label>
              <textarea name="challenges" value={form.challenges} onChange={handleChange} rows={3} placeholder="Any challenges or difficulties encountered..." />
            </div>

            <div className="form-group">
              <label>Key Learnings</label>
              <textarea name="learnings" value={form.learnings} onChange={handleChange} rows={3} placeholder="What did you learn this week?" />
            </div>

            <div className="form-group">
              <label>Objectives for Next Week</label>
              <textarea name="objectives_next_week" value={form.objectives_next_week} onChange={handleChange} rows={3} placeholder="Goals and objectives for the upcoming week..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Log' : 'Save Log'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View + Transition Modal */}
      <Modal open={!!viewLog} onClose={() => setViewLog(null)} title={`Week ${viewLog?.week_number} Log — ${viewLog?.student_detail?.full_name || 'My Log'}`} size="modal-lg">
        {viewLog && (
          <>
            <div className="modal-body">
              <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                <Badge status={viewLog.status} />
                {viewLog.submitted_at && <span className="text-sm text-secondary">Submitted: {new Date(viewLog.submitted_at).toLocaleDateString()}</span>}
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 700 }}>Activities Performed</label>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.7 }}>{viewLog.activities}</p>
              </div>

              {viewLog.challenges && (
                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>Challenges Faced</label>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.7 }}>{viewLog.challenges}</p>
                </div>
              )}

              {viewLog.learnings && (
                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>Key Learnings</label>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.7 }}>{viewLog.learnings}</p>
                </div>
              )}

              {viewLog.objectives_next_week && (
                <div className="form-group">
                  <label style={{ fontWeight: 700 }}>Next Week Objectives</label>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.7 }}>{viewLog.objectives_next_week}</p>
                </div>
              )}

              {/* Reviews */}
              {viewLog.reviews?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <hr className="divider" />
                  <h4 style={{ marginBottom: 12 }}>Supervisor Reviews</h4>
                  {viewLog.reviews.map(r => (
                    <div key={r.id} style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, marginBottom: 10, borderLeft: '3px solid var(--primary)' }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                        <span className="font-semibold text-sm">{r.reviewer_detail?.full_name}</span>
                        <Badge status={r.status} />
                      </div>
                      <p className="text-sm">{r.comments}</p>
                      <p className="text-muted text-sm mt-1">{new Date(r.reviewed_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Status history */}
              {viewLog.status_history?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <hr className="divider" />
                  <h4 style={{ marginBottom: 10 }}>Status History</h4>
                  {viewLog.status_history.map(h => (
                    <div key={h.id} className="flex items-center gap-2" style={{ marginBottom: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <Badge status={h.from_status} />
                      <span>→</span>
                      <Badge status={h.to_status} />
                      <span>by {h.changed_by_detail?.full_name}</span>
                      {h.note && <span>· {h.note}</span>}
                      <span style={{ marginLeft: 'auto' }}>{new Date(h.changed_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Transition actions */}
              {viewLog.allowed_transitions?.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <hr className="divider" />
                  <h4 style={{ marginBottom: 12 }}>Update Status</h4>
                  {(isSupervisor || isAdmin) && (
                    <>
                      <div className="form-group">
                        <label>Review Comments</label>
                        <textarea value={transitionComments} onChange={e => setTransitionComments(e.target.value)} rows={3} placeholder="Add comments for the student..." />
                      </div>
                      <div className="form-group">
                        <label>Internal Note (optional)</label>
                        <input value={transitionNote} onChange={e => setTransitionNote(e.target.value)} placeholder="Internal audit note..." />
                      </div>
                    </>
                  )}
                  <div className="table-actions flex" style={{ flexWrap: 'wrap', gap: 8 }}>
                    {viewLog.allowed_transitions.map(ts => {
                      if (!canTransition(viewLog, ts)) return null
                      const tl = TRANSITION_LABELS[ts]
                      return (
                        <button
                          key={ts}
                          className={`btn ${tl.cls}`}
                          disabled={!!transitioning}
                          onClick={() => doTransition(viewLog.id, ts)}
                        >
                          {transitioning === (viewLog.id + ts) ? 'Processing…' : tl.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewLog(null)}>Close</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
