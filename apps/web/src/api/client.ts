import axios from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '../store'

// ── Axios instance ───────────────────────────────────────────────
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor — attach bearer token ───────────────────
client.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor — refresh on 401, toast on 5xx ─────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null = null) {
  for (const prom of failedQueue) {
    if (token) {
      prom.resolve(token)
    } else {
      prom.reject(error)
    }
  }
  failedQueue = []
}

const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout']

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    // Don't retry auth endpoints or already-retried requests
    const isAuthEndpoint = AUTH_PATHS.some((p) => originalRequest?.url?.endsWith(p))

    if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue while another refresh is in-flight
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const store = useAuthStore.getState()
      const rt = store.refreshToken

      if (!rt) {
        isRefreshing = false
        store.clearAuth()
        // Don't redirect if already on /login or /wizard — prevents infinite reload loop
        const path = window.location.pathname
        if (path !== '/login' && path !== '/wizard') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      try {
        const res = await client.post('/auth/refresh', { refreshToken: rt })
        const { data } = res.data
        store.setToken(data.accessToken)
        store.setRefreshToken(data.refreshToken)
        processQueue(null, data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        store.clearAuth()
        // Don't redirect if already on /login or /wizard — prevents infinite reload loop
        const path = window.location.pathname
        if (path !== '/login' && path !== '/wizard') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    if (status && status >= 500) {
      toast.error('Server error. Please try again later.')
    }

    return Promise.reject(error)
  },
)

export default client

// ── Typed API namespace ──────────────────────────────────────────
export const api = {
  auth: {
    login: (data: { username: string; password: string; rememberMe?: boolean }) =>
      client.post('/auth/login', data),
    logout: (data?: { refreshToken?: string }) =>
      client.post('/auth/logout', data ?? {}),
    refresh: (data: { refreshToken: string }) =>
      client.post('/auth/refresh', data),
    verify2fa: (data: { temp_token: string; totp_code?: string; backup_code?: string }) =>
      client.post('/auth/2fa/verify', data),
    me: () => client.get('/auth/me'),
  },
  settings: {
    getPublic: () => client.get('/settings/public'),
    getAll: (key?: string) =>
      client.get('/settings', { params: key ? { key } : undefined }),
    update: (data: { key: string; value: string }) =>
      client.put('/settings', data),
  },
  tabs: {
    getAll: () => client.get('/tabs'),
    create: (data: Record<string, unknown>) => client.post('/tabs', data),
    update: (id: number, data: Record<string, unknown>) => client.put(`/tabs/${id}`, data),
    delete: (id: number) => client.delete(`/tabs/${id}`),
    reorder: (data: { tabs: Array<{ id: number; order: number }> }) =>
      client.put('/tabs/reorder', data),
  },
  categories: {
    getAll: () => client.get('/categories'),
  },
  groups: {
    getAll: () => client.get('/groups'),
    create: (data: Record<string, unknown>) => client.post('/groups', data),
    update: (id: number, data: Record<string, unknown>) => client.put(`/groups/${id}`, data),
    delete: (id: number) => client.delete(`/groups/${id}`),
  },
  users: {
    getAll: () => client.get('/users'),
    create: (data: Record<string, unknown>) => client.post('/users', data),
    update: (id: number, data: Record<string, unknown>) => client.put(`/users/${id}`, data),
    delete: (id: number) => client.delete(`/users/${id}`),
  },
  invites: {
    getAll: () => client.get('/invites'),
    create: (data: Record<string, unknown>) => client.post('/invites', data),
    delete: (id: number) => client.delete(`/invites/${id}`),
  },
  plugins: {
    getAll: () => client.get('/plugins'),
    install: (data: { name: string; version?: string }) => client.post('/plugins/install', data),
    remove: (name: string) => client.delete(`/plugins/${name}`),
    update: (name: string) => client.post(`/plugins/${name}/update`),
    search: (query?: string) =>
      client.get('/plugins/search', { params: query ? { q: query } : undefined }),
  },
  bookmarks: {
    getAll: () => client.get('/bookmarks'),
    create: (data: Record<string, unknown>) => client.post('/bookmarks', data),
    update: (id: number, data: Record<string, unknown>) => client.put(`/bookmarks/${id}`, data),
    delete: (id: number) => client.delete(`/bookmarks/${id}`),
  },
  wizard: {
    status: () => client.get('/wizard/status'),
    complete: (data: { username: string; password: string; email?: string; siteTitle?: string }) =>
      client.post('/wizard/complete', data),
  },
}
