import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Configure axios defaults
axios.defaults.baseURL = API_BASE

// Add request interceptor to include auth token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      window.location.href = '/login'
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
  const response = await axios.get('/api/auth/logout')
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
