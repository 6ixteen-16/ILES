import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { Alert } from '../components/UI'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password/', { email })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
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

        <h2 style={{ marginBottom: 4, fontSize: 18 }}>Forgot Password</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: 16 }}>
          Enter your email and we'll send you a reset link.
        </p>

        {error && <Alert type="error">{error}</Alert>}

        {success ? (
          <Alert type="success">
            If that email exists in our system, a reset link has been sent. Check your inbox.
          </Alert>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
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
