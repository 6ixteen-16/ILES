/* ── Modal ── */
export function Modal({ open, onClose, title, children, size = '' }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ── Status Badge ── */
const STATUS_CLASSES = {
  draft: 'badge-draft', active: 'badge-active', submitted: 'badge-submitted',
  reviewed: 'badge-reviewed', approved: 'badge-approved', rejected: 'badge-rejected',
  completed: 'badge-completed', cancelled: 'badge-cancelled', pending: 'badge-pending',
  A: 'badge-a', B: 'badge-b', C: 'badge-c', D: 'badge-d', F: 'badge-f',
}

export function Badge({ status }) {
  const cls = STATUS_CLASSES[status] || 'badge-draft'
  return <span className={`badge ${cls}`}>{status}</span>
}

/* ── Spinner ── */
export function Spinner() {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" />
    </div>
  )
}

/* ── Alert ── */
export function Alert({ type = 'error', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>
}

/* ── Confirm Delete Dialog ── */
export function ConfirmModal({ open, onClose, onConfirm, message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm Action">
      <div className="modal-body">
        <p>{message || 'Are you sure you want to proceed? This cannot be undone.'}</p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </Modal>
  )
}

/* ── Score Bar ── */
export function ScoreBar({ score }) {
  if (score == null) return <span className="text-muted text-sm">—</span>
  const color = score >= 70 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="score-bar-wrapper">
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-sm font-semibold" style={{ color, minWidth: 40 }}>{score}%</span>
    </div>
  )
}

/* ── Empty State ── */
export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3>{title || 'No data found'}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
