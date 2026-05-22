import { useState } from 'react'
import api from '../api/axios'
import { Alert } from './UI'

export default function CreateUserModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '',
    role: 'academic_supervisor', password: '',
    phone: '', student_id: '', organization: '', department: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const payload = { ...form }
      // Remove empty strings so the backend can use defaults or ignore them
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') delete payload[key]
      })

      await api.post('/auth/users/create/', payload)
      onSuccess()
    } catch (err) {
      if (err.response?.data && typeof err.response.data === 'object') {
        setErrors(err.response.data)
      } else {
        setErrors({ non_field_errors: ['Failed to create user. Please check your connection or backend server.'] })
      }
    } finally {
      setLoading(false)
    }
  }

  const err = (field) => errors[field]?.[0] || errors[field]

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>Create New User</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>×</button>
        </div>

        {err('non_field_errors') && <Alert type="error">{err('non_field_errors')}</Alert>}
        {err('detail') && <Alert type="error">{err('detail')}</Alert>}
        {err('error') && <Alert type="error">{err('error')}</Alert>}

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input name="first_name" required value={form.first_name} onChange={handle} />
              {err('first_name') && <span className="form-error">{err('first_name')}</span>}
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input name="last_name" required value={form.last_name} onChange={handle} />
              {err('last_name') && <span className="form-error">{err('last_name')}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Username</label>
              <input name="username" required value={form.username} onChange={handle} />
              {err('username') && <span className="form-error">{err('username')}</span>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" required value={form.email} onChange={handle} />
              {err('email') && <span className="form-error">{err('email')}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Role</label>
            <select name="role" value={form.role} onChange={handle}>
              <option value="academic_supervisor">Academic Supervisor</option>
              <option value="admin">Administrator</option>
              <option value="workplace_supervisor">Workplace Supervisor</option>
              <option value="student">Student Intern</option>
            </select>
          </div>

          {form.role === 'academic_supervisor' && (
            <div className="form-group">
              <label>Department</label>
              <input name="department" value={form.department} onChange={handle} placeholder="e.g. Computer Science" />
            </div>
          )}

          {form.role === 'workplace_supervisor' && (
            <div className="form-group">
              <label>Organization</label>
              <input name="organization" value={form.organization} onChange={handle} placeholder="e.g. Google" />
            </div>
          )}

          {form.role === 'student' && (
            <div className="form-group">
              <label>Student ID</label>
              <input name="student_id" value={form.student_id} onChange={handle} placeholder="e.g. 21/U/..." />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input name="phone" value={form.phone} onChange={handle} />
            </div>
            <div className="form-group">
              <label>Initial Password</label>
              <input name="password" placeholder="(Auto-generated if empty)" value={form.password} onChange={handle} />
              {err('password') && <span className="form-error">{err('password')}</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
