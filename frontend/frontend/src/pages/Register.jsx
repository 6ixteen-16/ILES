import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { Alert } from '../components/UI'

const ROLES = [
  { value: 'student', label: 'Student Intern' },
  { value: 'workplace_supervisor', label: 'Workplace Supervisor' },
  { value: 'academic_supervisor', label: 'Academic Supervisor' },
  { value: 'admin', label: 'Internship Administrator' },
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
      // Auto-login after registration
      await login(form.username, form.password)
      navigate('/dashboard')
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

          {form.role === 'academic_supervisor' && (
            <div className="form-group">
              <label>Department</label>
              <input name="department" value={form.department} onChange={handle} placeholder="e.g. Department of Computer Science" />
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
