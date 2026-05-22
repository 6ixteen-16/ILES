import { useEffect, useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Spinner, Badge, Modal, Alert, EmptyState, ScoreBar } from '../components/UI'

export default function Evaluations() {
  const { user } = useAuth()
  const [evaluations, setEvaluations] = useState([])
  const [criteria, setCriteria] = useState([])
  const [placements, setPlacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showScore, setShowScore] = useState(null)
  const [scores, setScores] = useState({})
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState({ placement: '', student: '' })
  const [createError, setCreateError] = useState('')
  const [students, setStudents] = useState([])

  const isStudent = user?.role === 'student'
  const isSupervisor = user?.role === 'workplace_supervisor' || user?.role === 'academic_supervisor'
  const isAdmin = user?.role === 'admin'
  const myType = user?.role === 'workplace_supervisor' ? 'workplace' : 'academic'

  const load = async () => {
    setLoading(true)
    try {
      const [evRes, criRes] = await Promise.all([
        api.get('/evaluations/'),
        api.get('/evaluations/criteria/'),
      ])
      setEvaluations(evRes.data.results || evRes.data)
      setCriteria(criRes.data.results || criRes.data)
    } catch { setError('Failed to load evaluations.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (isSupervisor) {
      api.get('/placements/').then(r => setPlacements(r.data.results || r.data)).catch(() => {})
    }
    if (isAdmin) {
      api.get('/auth/students/').then(r => setStudents(r.data)).catch(() => {})
      api.get('/placements/').then(r => setPlacements(r.data.results || r.data)).catch(() => {})
    }
  }, [isSupervisor, isAdmin])

  const openScoreModal = (ev) => {
    setShowScore(ev)
    const init = {}
    ev.criteria_scores?.forEach(cs => { init[cs.criteria] = cs.score })
    setScores(init)
    setComments(ev.comments || '')
  }

  const submitScores = async () => {
    setSaving(true)
    try {
      const scoreList = Object.entries(scores).map(([criteria, score]) => ({
        criteria: parseInt(criteria),
        score: parseFloat(score),
      }))
      const { data } = await api.post(`/evaluations/${showScore.id}/submit/`, {
        scores: scoreList,
        comments,
      })
      setEvaluations(prev => prev.map(e => e.id === data.id ? data : e))
      setShowScore(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit scores.')
    } finally { setSaving(false) }
  }

  const createEvaluation = async (e) => {
    e.preventDefault()
    setCreateError('')
    setSaving(true)
    try {
      const placement = placements.find(p => String(p.id) === String(createForm.placement))
      const { data } = await api.post('/evaluations/', {
        placement: createForm.placement,
        student: placement?.student || createForm.student,
      })
      setEvaluations(prev => [data, ...prev])
      setShowCreate(false)
    } catch (err) {
      setCreateError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed.')
    } finally { setSaving(false) }
  }

  const myCriteria = criteria.filter(c => c.is_active && (isAdmin || c.evaluator_type === myType))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Evaluations</h1>
          <p className="text-secondary">Performance scores and grades</p>
        </div>
        {isSupervisor && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Evaluation</button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? <Spinner /> : evaluations.length === 0 ? (
        <EmptyState
          title="No evaluations yet"
          description={isStudent ? "Your evaluations will appear here once supervisors submit them." : "Start a new evaluation for one of your assigned students."}
          action={isSupervisor ? <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Evaluation</button> : null}
        />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {!isStudent && <th>Student</th>}
                <th>Organization</th>
                <th>Evaluator</th>
                <th>Type</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map(ev => (
                <tr key={ev.id}>
                  {!isStudent && <td><strong>{ev.student_detail?.full_name || '—'}</strong></td>}
                  <td className="text-sm text-secondary">{ev.placement}</td>
                  <td className="text-sm">{ev.evaluator_detail?.full_name}</td>
                  <td><span className="badge badge-draft">{ev.evaluator_type_display}</span></td>
                  <td style={{ minWidth: 160 }}>
                    <ScoreBar score={ev.total_score} />
                  </td>
                  <td>{ev.grade ? <Badge status={ev.grade} /> : <span className="text-muted">—</span>}</td>
                  <td><Badge status={ev.is_submitted ? 'approved' : 'draft'} /></td>
                  <td>
                    {!ev.is_submitted && ev.evaluator === user.id && (
                      <button className="btn btn-primary btn-sm" onClick={() => openScoreModal(ev)}>Score</button>
                    )}
                    {ev.is_submitted && (
                      <button className="btn btn-secondary btn-sm" onClick={() => openScoreModal(ev)}>View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Evaluation Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Evaluation">
        <form onSubmit={createEvaluation}>
          <div className="modal-body">
            {createError && <Alert type="error">{createError}</Alert>}
            <div className="form-group">
              <label>Placement *</label>
              <select value={createForm.placement} onChange={e => setCreateForm({ ...createForm, placement: e.target.value })} required>
                <option value="">— Select Placement —</option>
                {placements.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.student_detail?.full_name} @ {p.organization}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Evaluation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Score Modal */}
      <Modal open={!!showScore} onClose={() => setShowScore(null)} title="Evaluation Scores" size="modal-lg">
        {showScore && (
          <>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <p><strong>Student:</strong> {showScore.student_detail?.full_name}</p>
                <p><strong>Evaluator:</strong> {showScore.evaluator_detail?.full_name}</p>
                {showScore.total_score != null && (
                  <div style={{ marginTop: 12 }}>
                    <strong>Total Score: </strong>
                    <ScoreBar score={showScore.total_score} />
                    {showScore.grade && <span style={{ marginTop: 6, display: 'block' }}>Grade: <Badge status={showScore.grade} /></span>}
                  </div>
                )}
              </div>

              <hr className="divider" />

              {myCriteria.length === 0 && !showScore.is_submitted && (
                <Alert type="warning">No evaluation criteria configured. Contact the administrator to set up criteria.</Alert>
              )}

              {(showScore.is_submitted ? showScore.criteria_scores : myCriteria).map(item => {
                const cr = showScore.is_submitted ? item.criteria_detail : item
                const sc = showScore.is_submitted ? item.score : (scores[cr?.id] ?? '')
                return (
                  <div key={cr?.id} style={{ marginBottom: 18 }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <div>
                        <span className="font-semibold text-sm">{cr?.name}</span>
                        <span className="text-muted text-sm" style={{ marginLeft: 8 }}>({cr?.weight}% weight)</span>
                      </div>
                      <span className="text-sm text-secondary">Max: {cr?.max_score}</span>
                    </div>
                    {cr?.description && <p className="text-muted text-sm" style={{ marginBottom: 6 }}>{cr.description}</p>}
                    {showScore.is_submitted ? (
                      <ScoreBar score={(sc / cr?.max_score) * 100} />
                    ) : (
                      <input
                        type="number"
                        min="0"
                        max={cr?.max_score}
                        step="0.5"
                        value={scores[cr?.id] ?? ''}
                        onChange={e => setScores({ ...scores, [cr?.id]: e.target.value })}
                        placeholder={`Score out of ${cr?.max_score}`}
                        style={{ maxWidth: 200 }}
                      />
                    )}
                  </div>
                )
              })}

              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Overall Comments</label>
                {showScore.is_submitted ? (
                  <p style={{ fontSize: '0.9rem' }}>{showScore.comments || '—'}</p>
                ) : (
                  <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3} placeholder="General comments about the student's performance..." />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowScore(null)}>Close</button>
              {!showScore.is_submitted && showScore.evaluator === user.id && (
                <button className="btn btn-success" onClick={submitScores} disabled={saving}>
                  {saving ? 'Submitting…' : 'Submit Final Score'}
                </button>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
