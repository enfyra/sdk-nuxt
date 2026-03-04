import type { Ref } from 'vue'

export type OAuthProvider = 'google' | 'facebook' | 'github'

export interface User {
  id: string
  email: string
  isRootAdmin: boolean
  isSystem: boolean
  role?: {
    id: string
    name: string
    routePermissions: RoutePermission[]
  }
  allowedRoutePermissions?: RoutePermission[]
}

export interface RoutePermission {
  id: string
  isEnabled: boolean
  allowedUsers?: { id: string }[]
  methods: { id: string; method: string }[]
  route: { id: string; path: string }
}

export interface LoginPayload {
  email: string
  password: string
  remember?: boolean
}

export interface UseEnfyraAuthReturn {
  me: Ref<User | null>
  login: (payload: LoginPayload) => Promise<any>
  logout: () => Promise<void>
  fetchUser: (options?: { fields?: string[] }) => Promise<void>
  isLoggedIn: Ref<boolean>
  oauthLogin: (provider: OAuthProvider) => void
}