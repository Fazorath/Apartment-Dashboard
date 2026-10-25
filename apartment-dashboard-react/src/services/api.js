import axios from 'axios'

// Prefer relative requests in dev (use Vite proxy). Allow override via VITE_API_URL in prod.
const API_BASE = import.meta.env.VITE_API_URL || ''

// Configure axios defaults if provided
if (API_BASE) {
  axios.defaults.baseURL = API_BASE
}

// Add request interceptor to include auth token (prefer localStorage, fallback to sessionStorage)
axios.interceptors.request.use((config) => {
  let token = localStorage.getItem('authToken')
  if (!token) {
    token = sessionStorage.getItem('authToken')
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor to handle auth errors without hard redirects (avoid loops)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear both storages; AuthContext will show login automatically
      localStorage.removeItem('authToken')
      localStorage.removeItem('rememberMe')
      sessionStorage.removeItem('authToken')
    }
    return Promise.reject(error)
  }
)

// Auth API
export const login = async (username, password) => {
  const response = await axios.post('/api/auth/login', { username, password })
  return response.data
}

export const register = async (username, password) => {
  const response = await axios.post('/api/auth/register', { username, password })
  return response.data
}

export const logout = async () => {
  const response = await axios.post('/api/auth/logout')
  return response.data
}

export const getCurrentUser = async () => {
  const response = await axios.get('/api/auth/me')
  return response.data
}

// Tasks API
export const getTasks = async () => {
  const response = await axios.get('/api/tasks')
  return response.data
}

export const createTask = async (taskData) => {
  const response = await axios.post('/api/tasks', taskData)
  return response.data
}

export const updateTask = async ({ id, ...taskData }) => {
  const response = await axios.put(`/api/tasks/${id}`, taskData)
  return response.data
}

export const deleteTask = async (id) => {
  const response = await axios.delete(`/api/tasks/${id}`)
  return response.data
}

export const markTaskDone = async (id) => {
  const response = await axios.post(`/api/tasks/${id}/done`)
  return response.data
}


// Apartment API
export const updateApartmentName = async (apartmentName) => {
  const response = await axios.put('/api/apartment/name', { apartmentName })
  return response.data
}

// Email verification API
export const updateEmail = async (email) => {
  const response = await axios.put('/api/auth/email', { email })
  return response.data
}

export const resendVerificationEmail = async () => {
  const response = await axios.post('/api/auth/send-verification')
  return response.data
}

export const verifyEmail = async (token) => {
  const response = await axios.post('/api/auth/verify-email', { token })
  return response.data
}

// Password reset API
export const requestPasswordReset = async (identifier) => {
  const response = await axios.post('/api/auth/request-password-reset', { identifier })
  return response.data
}

export const resetPassword = async (token, password) => {
  const response = await axios.post('/api/auth/reset-password', { token, password })
  return response.data
}

// Two-factor login API
export const setupTwoFactor = async () => {
  const response = await axios.post('/api/auth/2fa/setup')
  return response.data
}

export const confirmTwoFactor = async (code) => {
  const response = await axios.post('/api/auth/2fa/confirm', { code })
  return response.data
}

export const disableTwoFactor = async (code) => {
  const response = await axios.post('/api/auth/2fa/disable', { code })
  return response.data
}

// Sign in with Google / Apple API; `provider` is 'google' or 'apple'
export const startSocialSignIn = async (provider, intent) => {
  const response = await axios.post(`/api/auth/${provider}/start`, { intent })
  return response.data
}

export const finishSocialSignIn = async (provider, code, state) => {
  const response = await axios.post(`/api/auth/${provider}/callback`, { code, state })
  return response.data
}

export const completeSocialSignUp = async (provider, details) => {
  const response = await axios.post(`/api/auth/${provider}/complete`, details)
  return response.data
}
