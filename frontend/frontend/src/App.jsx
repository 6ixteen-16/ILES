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
import './index.css'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/placements': 'Placements',
  '/logbook': 'Weekly Logbook',
  '/evaluations': 'Evaluations',
  '/users': 'Manage Users',
  '/profile': 'My Profile',
}

function Topbar() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'ILES'
  return (
    <header className="topbar">
      <span className="topbar-title">{title}</span>
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

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
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
      <Route path="/users" element={<ProtectedRoute><AppLayout><Users /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
