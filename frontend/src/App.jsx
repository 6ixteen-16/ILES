
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Placements from './pages/Placements'
import Logbook from './pages/Logbook'
import Evaluations from './pages/Evaluations'
import Users from './pages/Users'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import './index.css'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/placements': 'Placements',
  '/logbook': 'Weekly Logbook',
  '/evaluations': 'Evaluations',
  '/users': 'Manage Users',
  '/profile': 'My Profile',
}

function Topbar({ onMenuToggle }) {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'ILES'
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="topbar-title">{title}</span>
      </div>
      <div className="topbar-right">
        <span className="text-secondary text-sm">Makerere University</span>
      </div>
    </header>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

/** Requires the logged-in user to have one of the allowed roles.
 *  Unauthorised users are redirected to /dashboard silently. */
function RoleRoute({ roles, children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="page-body">{children}</main>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/placements" element={<ProtectedRoute><AppLayout><Placements /></AppLayout></ProtectedRoute>} />
      <Route path="/logbook" element={<ProtectedRoute><AppLayout><Logbook /></AppLayout></ProtectedRoute>} />
      <Route path="/evaluations" element={<ProtectedRoute><AppLayout><Evaluations /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      {/* Admin-only route — non-admins are redirected to /dashboard */}
      <Route path="/users" element={
        <RoleRoute roles={['admin']}>
          <AppLayout><Users /></AppLayout>
        </RoleRoute>
      } />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
