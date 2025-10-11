import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-[#0b0c10] text-white">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#0b0b0f', color: '#f5f5f5'}}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  
  if (!user) {
    return <Login />
  }
  
  // Check if user is admin
  if (user.isAdmin) {
    return <AdminDashboard />
  }
  
  return <Dashboard />
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  
  console.log('ProtectedRoute - loading:', loading, 'user:', user)
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#0b0b0f', color: '#f5f5f5'}}>
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  
  if (!user) {
    console.log('No user, redirecting to login')
    return <Navigate to="/login" replace />
  }
  
  console.log('User authenticated, showing dashboard')
  return children
}

export default App