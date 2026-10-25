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

  // Store a session token (from sign-in or the 2FA step) and show the signed-in user
  const startSession = (data, rememberMe) => {
    if (rememberMe) {
      // Store in localStorage for persistent login (survives browser restart)
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('rememberMe', 'true')
    } else {
      // Store in sessionStorage for session-only login (cleared when browser closes)
      sessionStorage.setItem('authToken', data.token)
      localStorage.removeItem('authToken')
      localStorage.removeItem('rememberMe')
    }

    setUser({
      username: data.user.username,
      apartmentCode: data.user.apartmentCode,
      apartmentName: data.user.apartmentName,
      email: data.user.email,
      emailVerified: data.user.emailVerified,
      googleLinked: data.user.googleLinked,
      appleLinked: data.user.appleLinked,
      isAdmin: data.user.isAdmin,
      twoFactorEnabled: data.user.twoFactorEnabled
    })
  }

  // With 2FA on, resolves to `{ success: false, twoFactorToken }`: pass that and a code to `completeTwoFactorLogin`
  const login = async (username, password, apartmentCode = null, rememberMe = false) => {
    try {
      const response = await axios.post('/api/auth/login', {
        username,
        password,
        apartmentCode
      })

      if (response.data.twoFactorRequired) {
        return { success: false, twoFactorToken: response.data.twoFactorToken }
      }
      if (response.data.success) {
        startSession(response.data, rememberMe)
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

  // `reason` is 'expired' when the password step has to be redone
  const completeTwoFactorLogin = async (twoFactorToken, code, rememberMe = false) => {
    try {
      const response = await axios.post('/api/auth/login/2fa', { twoFactorToken, code })
      startSession(response.data, rememberMe)
      return { success: true }
    } catch (error) {
      console.error('2FA login error:', error)
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
        reason: error.response?.data?.reason
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

  const setTwoFactorEnabled = (twoFactorEnabled) => {
    setUser((prev) => (prev ? { ...prev, twoFactorEnabled } : prev))
  }

  // `provider` is 'google' or 'apple'
  const setProviderLinked = (provider, linked) => {
    setUser((prev) => (prev ? { ...prev, [`${provider}Linked`]: linked } : prev))
  }

  // Sign in with a session the server already issued (Google sign-in), kept across restarts
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
      isAdmin: sessionUser.isAdmin,
      twoFactorEnabled: sessionUser.twoFactorEnabled
    })
  }

  const value = {
    user,
    setApartmentName,
    setEmailStatus,
    setTwoFactorEnabled,
    setProviderLinked,
    acceptSession,
    loading,
    login,
    completeTwoFactorLogin,
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