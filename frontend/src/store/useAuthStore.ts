import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Static credentials ────────────────────────────────────────────────────────
// Both roles share the same static creds for now: admin / admin
const STATIC_CREDENTIALS = {
  username: 'admin',
  password: 'admin',
}

export type UserRole = 'participant' | 'brand'

interface AuthState {
  isAuthenticated: boolean
  role:            UserRole | null
  username:         string | null
  brandName:       string | null   // set on brand login

  login:  (username: string, password: string, role: UserRole, brandName?: string) => boolean
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      role:            null,
      username:        null,
      brandName:       null,

      login: (username, password, role, brandName) => {
        const valid =
          username.trim().toLowerCase() === STATIC_CREDENTIALS.username &&
          password === STATIC_CREDENTIALS.password

        if (valid) {
          set({
            isAuthenticated: true,
            role,
            username: username.trim(),
            brandName: role === 'brand' ? (brandName?.trim() || 'My Brand') : null,
          })
        }
        return valid
      },

      logout: () =>
        set({ isAuthenticated: false, role: null, username: null, brandName: null }),
    }),
    { name: 'auth-state' }
  )
)
