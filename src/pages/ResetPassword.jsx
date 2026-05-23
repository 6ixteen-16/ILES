import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/axios'
import { Alert } from '../components/UI'

export default function ResetPassword() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.new_password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    if (form.new_password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password/', {
        uid,
        token,
        new_password: form.new_password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>ILES</h1>
          <p>Internship Logging &amp; Evaluation System</p>
          <p className="text-secondary text-sm" style={{ marginTop: 4 }}>Makerere University</p>
        </div>

        <h2 style={{ marginBottom: 4, fontSize: 18 }}>Set New Password</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: 16 }}>
          Choose a strong password for your account.
        </p>

        {error && <Alert type="error">{error}</Alert>}

        {success ? (
          <Alert type="success">
            Password reset successful! Redirecting to login…
          </Alert>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="new_password">New Password</label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                value={form.new_password}
                onChange={handle}
                placeholder="Enter new password"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm_password">Confirm Password</label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={handle}
                placeholder="Confirm new password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="text-secondary text-sm" style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/login" className="auth-link">← Back to Login</Link>
        </p>
      </div>
    </div>
  )
}
