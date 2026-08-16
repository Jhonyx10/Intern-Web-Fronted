import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { LoginResponse, User } from '@/types'

const TOKEN_KEY = 'occ_spa_token'

type AuthContextValue = {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(token),
    queryFn: async () => {
      try {
        return await apiRequest<{ user: User }>('/auth/me', { token: token! })
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        throw new Error('Session expired.')
      }
    },
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      localStorage.setItem(TOKEN_KEY, data.access_token)
      queryClient.setQueryData(queryKeys.auth.me(data.access_token), { user: data.user })
      setToken(data.access_token)
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    if (token) {
      try {
        await apiRequest('/auth/logout', { method: 'POST', token })
      } catch {
        // Still clear local session if the API call fails.
      }
    }

    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    queryClient.removeQueries({ queryKey: queryKeys.auth.all })
    queryClient.removeQueries({ queryKey: queryKeys.companies.all })
  }, [queryClient, token])

  const value = useMemo(
    () => ({
      user: meQuery.data?.user ?? null,
      token,
      loading: Boolean(token) && meQuery.isPending,
      login,
      logout,
    }),
    [meQuery.data?.user, meQuery.isPending, token, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
