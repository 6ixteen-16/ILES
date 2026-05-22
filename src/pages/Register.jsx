import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { Alert } from '../components/UI'

// Only student and workplace_supervisor may self-register.
// Academic supervisors and administrators are created by the admin panel.
const ROLES = [
  { value: 'student', label: 'Student Intern' },
  { value: 'workplace_supervisor', label: 'Workplace Supervisor' },
]

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    password: '', password2: '', role: 'student',
    phone: '', student_id: '', organization: '', department: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const [pendingApproval, setPendingApproval] = useState(false)

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: null })
  }

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await api.post('/auth/register/', form)

      if (form.role === 'workplace_supervisor') {
        // Supervisor accounts require admin approval before they can log in.
        // Do NOT auto-login — show pending approval screen instead.
        setPendingApproval(true)
      } else {
        // Students are auto-logged in immediately.
        await login(form.username, form.password)
        navigate('/dashboard')
      }
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        setErrors(data)
      } else {
        setErrors({ non_field_errors: ['Registration failed. Please try again.'] })
      }
    } finally {
      setLoading(false)
    }
  }

  const err = (field) => errors[field]?.[0] || errors[field]

  // ── Pending approval screen (workplace supervisors only) ──────────────────
  if (pendingApproval) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--warning-light)', color: 'var(--warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 8 }}>Account Pending Approval</h2>
            <p className="text-secondary" style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
              Your registration as a <strong>Workplace Supervisor</strong> was received successfully.
              An administrator will review and approve your account before you can sign in.
            </p>
          </div>
          <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: 20 }}>
            You will be able to log in once an admin approves your account.
            If you haven't heard back after 24 hours, contact your internship coordinator.
          </div>
          <Link to="/login" className="btn btn-primary btn-block">Back to Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <h1>ILES</h1>
          <p>Create your account</p>
        </div>

        {err('non_field_errors') && <Alert type="error">{err('non_field_errors')}</Alert>}

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input name="first_name" value={form.first_name} onChange={handle} placeholder="First name" required className={err('first_name') ? 'error' : ''} />
              {err('first_name') && <span className="form-error">{err('first_name')}</span>}
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input name="last_name" value={form.last_name} onChange={handle} placeholder="Last name" required className={err('last_name') ? 'error' : ''} />
              {err('last_name') && <span className="form-error">{err('last_name')}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Username</label>
            <input name="username" value={form.username} onChange={handle} placeholder="Choose a username" required className={err('username') ? 'error' : ''} />
            {err('username') && <span className="form-error">{err('username')}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handle} placeholder="you@example.com" required className={err('email') ? 'error' : ''} />
            {err('email') && <span className="form-error">{err('email')}</span>}
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={form.role} onChange={handle}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {form.role === 'workplace_supervisor' && (
            <div className="alert alert-warning" style={{ marginBottom: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                Workplace Supervisor accounts require <strong>admin approval</strong> before you can sign in.
                You will be notified once your account is activated.
              </span>
            </div>
          )}

          {form.role === 'student' && (
            <div className="form-group">
              <label>Student ID</label>
              <input name="student_id" value={form.student_id} onChange={handle} placeholder="e.g. 22/U/1234" />
            </div>
          )}

          {form.role === 'workplace_supervisor' && (
            <div className="form-group">
              <label>Organization</label>
              <input name="organization" value={form.organization} onChange={handle} placeholder="Your company/organization" />
            </div>
          )}

          <div className="form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={handle} placeholder="+256 700 000 000" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handle} placeholder="Password" required className={err('password') ? 'error' : ''} />
              {err('password') && <span className="form-error">{err('password')}</span>}
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input name="password2" type="password" value={form.password2} onChange={handle} placeholder="Repeat password" required className={err('password2') ? 'error' : ''} />
              {err('password2') && <span className="form-error">{err('password2')}</span>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-secondary text-sm" style={{ textAlign: 'center', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
