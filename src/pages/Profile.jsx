import { useState } from 'react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import { Alert } from '../components/UI'

const ROLE_LABELS = {
  student: 'Student Intern',
  workplace_supervisor: 'Workplace Supervisor',
  academic_supervisor: 'Academic Supervisor',
  admin: 'Internship Administrator',
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    student_id: user?.student_id || '',
    organization: user?.organization || '',
    department: user?.department || '',
    bio: user?.bio || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [saveError, setSaveError] = useState('')

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaveMsg('')
    try {
      const { data } = await api.patch('/auth/me/', form)
      updateUser(data)
      setSaveMsg('Profile updated successfully.')
      setEditing(false)
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to save profile.')
    } finally { setSaving(false) }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwSaving(true)
    setPwError('')
    setPwMsg('')
    try {
      await api.post('/auth/change-password/', pwForm)
      setPwMsg('Password changed successfully.')
      setPwForm({ old_password: '', new_password: '' })
    } catch (err) {
      const d = err.response?.data
      setPwError(d?.old_password?.[0] || d?.new_password?.[0] || d?.detail || 'Failed to change password.')
    } finally { setPwSaving(false) }
  }

  const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase() || user?.username?.[0]?.toUpperCase()

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Profile Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Profile Information</h3>
            {!editing && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
            )}
          </div>
          <div className="card-body">
            {/* Avatar + Role */}
            <div className="flex items-center gap-2" style={{ marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64,
                background: 'var(--primary)',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 700,
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: '1.1rem' }}>
                  {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                </div>
                <div className="text-secondary text-sm">{ROLE_LABELS[user?.role] || user?.role}</div>
                <div className="text-muted text-sm">@{user?.username}</div>
              </div>
            </div>

            {saveMsg && <Alert type="success">{saveMsg}</Alert>}
            {saveError && <Alert type="error">{saveError}</Alert>}

            {editing ? (
              <form onSubmit={saveProfile}>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="First name" />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last name" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email address" />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+256 700 000 000" />
                </div>
                {user?.role === 'student' && (
                  <div className="form-group">
                    <label>Student ID</label>
                    <input name="student_id" value={form.student_id} onChange={handleChange} placeholder="e.g. 22/U/1234" />
                  </div>
                )}
                {user?.role === 'workplace_supervisor' && (
                  <div className="form-group">
                    <label>Organization</label>
                    <input name="organization" value={form.organization} onChange={handleChange} placeholder="Organization" />
                  </div>
                )}
                {user?.role === 'academic_supervisor' && (
                  <div className="form-group">
                    <label>Department</label>
                    <input name="department" value={form.department} onChange={handleChange} placeholder="Department" />
                  </div>
                )}
                <div className="form-group">
                  <label>Bio</label>
                  <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} placeholder="Short bio..." />
                </div>
                <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
              </form>
            ) : (
              <div className="detail-grid">
                <div className="detail-item"><label>Email</label><p>{user?.email || '—'}</p></div>
                <div className="detail-item"><label>Phone</label><p>{user?.phone || '—'}</p></div>
                {user?.student_id && <div className="detail-item"><label>Student ID</label><p>{user.student_id}</p></div>}
                {user?.organization && <div className="detail-item"><label>Organization</label><p>{user.organization}</p></div>}
                {user?.department && <div className="detail-item"><label>Department</label><p>{user.department}</p></div>}
                <div className="detail-item"><label>Member Since</label><p>{user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : '—'}</p></div>
                {user?.bio && <div className="detail-item" style={{ gridColumn: '1 / -1' }}><label>Bio</label><p>{user.bio}</p></div>}
              </div>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Change Password</h3>
          </div>
          <div className="card-body">
            {pwMsg && <Alert type="success">{pwMsg}</Alert>}
            {pwError && <Alert type="error">{pwError}</Alert>}
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={pwForm.old_password}
                  onChange={e => setPwForm({ ...pwForm, old_password: e.target.value })}
                  placeholder="Current password"
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={pwForm.new_password}
                  onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                  placeholder="New password (min 8 characters)"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                {pwSaving ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
