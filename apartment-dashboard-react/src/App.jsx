import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthProvider } from './contexts/AuthContext'
import useAuth from './hooks/useAuth'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import VerifyEmail from './components/VerifyEmail'
import { ForgotPassword, ResetPassword } from './components/PasswordRecovery'
import SocialCallback from './components/SocialCallback'

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-subtle" role="status" aria-label="Loading">
        <Loader2 size={28} className="animate-spin" />
      </div>
    )
  }

  // Verification links can be opened on a device that isn't signed in
  if (location.pathname === '/verify-email') return <VerifyEmail />

  // Same for reset links; the request screen is for people who can't sign in
  if (location.pathname === '/reset-password') return <ResetPassword />
  if (!user && location.pathname === '/forgot-password') return <ForgotPassword />

  // Google and Apple return here both to sign in and, for a signed-in roommate, to link
  if (location.pathname === '/auth/google/callback') return <SocialCallback provider="google" />
  if (location.pathname === '/auth/apple/callback') return <SocialCallback provider="apple" />

  if (!user) return <Login />

  if (user.isAdmin) {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tasks/:taskId" element={<Dashboard />} />
      <Route path="/settings" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
