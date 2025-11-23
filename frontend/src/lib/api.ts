import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Use environment variable for API URL, fallback to relative path for development
// In production, this should be set to: https://jtutors.onrender.com/api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Log API configuration
if (import.meta.env.DEV) {
  console.log('🔧 API Base URL:', API_BASE_URL)
  console.log('🔧 VITE_API_URL env:', import.meta.env.VITE_API_URL)
} else {
  // Production: Warn if using relative path (won't work with different domains)
  if (API_BASE_URL === '/api') {
    console.warn('⚠️ WARNING: VITE_API_URL is not set!')
    console.warn('⚠️ Frontend will try to use relative path /api which may not work.')
    console.warn('⚠️ Set VITE_API_URL=https://jtutors.onrender.com/api in your build environment.')
  } else {
    console.log('✅ API Base URL configured:', API_BASE_URL)
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url)
    }
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor for error handling and debugging
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('📥 API Response:', response.config.method?.toUpperCase(), response.config.url, response.status)
    }
    return response
  },
  (error) => {
    // Log error details
    console.error('❌ API Error:', {
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    })

    // Handle network errors (CORS, connection refused, etc.)
    if (!error.response) {
      console.error('🚫 Network Error - Check if backend is running and CORS is configured')
      if (error.message.includes('Network Error') || error.code === 'ERR_NETWORK') {
        console.error('💡 Tip: Make sure VITE_API_URL is set to https://jtutors.onrender.com/api')
      }
    }

    // Handle auth errors
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

export default api

