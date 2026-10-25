import { useState, useEffect } from 'react'
import axios from 'axios'
import { AuthContext } from '../hooks/useAuth'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Check both localStorage (remember me) and sessionStorage (session only)
      let token = localStorage.getItem('authToken')
      
      // If no token in localStorage, check sessionStorage
      if (!token) {
        token = sessionStorage.getItem('authToken')
      }
      
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }
      
      // Set the token in axios headers for this request
      const response = await axios.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      
      if (response.data.success) {
        setUser(response.data.user)
      } else {
        // Clear both storage locations on auth failure
        localStorage.removeItem('authToken')
        localStorage.removeItem('rememberMe')
        sessionStorage.removeItem('authToken')
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      // Clear both storage locations on error
      localStorage.removeItem('authToken')
      localStorage.removeItem('rememberMe')
      sessionStorage.removeItem('authToken')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password, apartmentCode = null, rememberMe = false) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password,
        apartmentCode
      })
      
      if (response.data.success) {
        const token = response.data.token
        
        // Store token based on remember me preference
        if (rememberMe) {
          // Store in localStorage for persistent login (survives browser restart)
          localStorage.setItem('authToken', token)
          localStorage.setItem('rememberMe', 'true')
        } else {
          // Store in sessionStorage for session-only login (cleared when browser closes)
          sessionStorage.setItem('authToken', token)
          localStorage.removeItem('authToken')
          localStorage.removeItem('rememberMe')
        }
        
        setUser({ 
          username: response.data.user.username,
          apartmentCode: response.data.user.apartmentCode,
          apartmentName: response.data.user.apartmentName,
          email: response.data.user.email,
          emailVerified: response.data.user.emailVerified,
          googleLinked: response.data.user.googleLinked,
          appleLinked: response.data.user.appleLinked,
          isAdmin: response.data.user.isAdmin
        })
        return { success: true }
      }
      return { success: false, error: 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      }
    }
  }

  const register = async (username, password, apartmentCode, email = null) => {
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        password,
        apartmentCode,
        email
      })
      
      if (response.data.success) {
        const token = response.data.token
        // For registration, always use localStorage (persistent login)
        localStorage.setItem('authToken', token)
        localStorage.setItem('rememberMe', 'true')
        setUser({ 
          username: response.data.user.username,
          apartmentCode: response.data.user.apartmentCode,
          apartmentName: response.data.user.apartmentName,
          email: response.data.user.email,
          emailVerified: response.data.user.emailVerified,
          isAdmin: response.data.user.isAdmin
        })
        return { success: true }
      }
      return { success: false, error: 'Registration failed' }
    } catch (error) {
      console.error('Registration error:', error)
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed',
        reasons: error.response?.data?.reasons
      }
    }
  }

  const createApartment = async (username, password, apartmentCode, apartmentName, email = null) => {
    try {
      const response = await axios.post('/api/auth/create-apartment', {
        username,
        password,
        apartmentCode,
        apartmentName,
        email
      })
      
      if (response.data.success) {
        const token = response.data.token
        // For apartment creation, always use localStorage (persistent login)
        localStorage.setItem('authToken', token)
        localStorage.setItem('rememberMe', 'true')
        setUser({ 
          username: response.data.user.username,
          apartmentCode: response.data.user.apartmentCode,
          apartmentName: response.data.user.apartmentName,
          email: response.data.user.email,
          emailVerified: response.data.user.emailVerified,
          isAdmin: response.data.user.isAdmin
        })
        return { success: true }
      }
      return { success: false, error: 'Apartment creation failed' }
    } catch (error) {
      console.error('Create apartment error:', error)
      return { 
        success: false, 
        error: error.response?.data?.error || 'Apartment creation failed',
        reasons: error.response?.data?.reasons
      }
    }
  }

  const generateApartmentCode = async () => {
    try {
      const response = await axios.get('/api/auth/generate-apartment-code')
      if (response.data.success) {
        return { success: true, apartmentCode: response.data.apartmentCode }
      }
      return { success: false, error: 'Failed to generate apartment code' }
    } catch (error) {
      console.error('Generate apartment code error:', error)
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to generate apartment code' 
      }
    }
  }

  const logout = () => {
    // Clear both localStorage and sessionStorage
    localStorage.removeItem('authToken')
    localStorage.removeItem('rememberMe')
    sessionStorage.removeItem('authToken')
    setUser(null)
  }

  const setApartmentName = (apartmentName) => {
    setUser((prev) => (prev ? { ...prev, apartmentName } : prev))
  }

  const setEmailStatus = ({ email, emailVerified }) => {
    setUser((prev) => (prev ? { ...prev, email, emailVerified } : prev))
  }

  // `provider` is 'google' or 'apple'
  const setProviderLinked = (provider, linked) => {
    setUser((prev) => (prev ? { ...prev, [`${provider}Linked`]: linked } : prev))
  }

  // Sign in with a session the server already issued (Google or Apple sign-in), kept across restarts
  const acceptSession = (token, sessionUser) => {
    localStorage.setItem('authToken', token)
    localStorage.setItem('rememberMe', 'true')
    sessionStorage.removeItem('authToken')
    setUser({
      username: sessionUser.username,
      apartmentCode: sessionUser.apartmentCode,
      apartmentName: sessionUser.apartmentName,
      email: sessionUser.email,
      emailVerified: sessionUser.emailVerified,
      googleLinked: sessionUser.googleLinked,
      appleLinked: sessionUser.appleLinked,
      isAdmin: sessionUser.isAdmin
    })
  }

  const value = {
    user,
    setApartmentName,
    setEmailStatus,
    setProviderLinked,
    acceptSession,
    loading,
    login,
    register,
    createApartment,
    logout,
    generateApartmentCode
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}