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
