'use client'

import { create } from 'zustand'
import type {
  User,
  ScreenName,
  Claim,
  AgentListItem,
  AdminStats,
} from './types'
import {
  getToken,
  getStoredUser,
  persistSession,
  clearSession,
} from './api-client'

interface AppState {
  // auth
  user: User | null
  token: string | null
  isAuthenticated: boolean
  hydrating: boolean

  // navigation
  screen: ScreenName
  // for the claim detail screen
  currentClaimId: number | null

  // data caches
  myClaims: Claim[]
  myClaimsTotal: number
  adminClaims: Claim[]
  adminClaimsTotal: number
  agents: AgentListItem[]
  stats: AdminStats | null

  // actions
  hydrate: () => void
  login: (token: string, user: User) => void
  logout: () => void
  navigate: (screen: ScreenName) => void
  openClaim: (id: number) => void
  setMyClaims: (claims: Claim[], total: number) => void
  setAdminClaims: (claims: Claim[], total: number) => void
  setAgents: (agents: AgentListItem[]) => void
  setStats: (stats: AdminStats) => void
  updateUser: (patch: Partial<User>) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrating: true,

  screen: 'login',
  currentClaimId: null,

  myClaims: [],
  myClaimsTotal: 0,
  adminClaims: [],
  adminClaimsTotal: 0,
  agents: [],
  stats: null,

  hydrate: () => {
    const token = getToken()
    const user = getStoredUser()
    if (token && user) {
      set({
        token,
        user,
        isAuthenticated: true,
        hydrating: false,
        screen: user.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard',
      })
    } else {
      set({ hydrating: false, screen: 'login' })
    }
  },

  login: (token, user) => {
    persistSession(token, user)
    set({
      token,
      user,
      isAuthenticated: true,
      screen: user.role === 'admin' ? 'admin-dashboard' : 'agent-dashboard',
    })
  },

  logout: () => {
    clearSession()
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      screen: 'login',
      currentClaimId: null,
      myClaims: [],
      myClaimsTotal: 0,
      adminClaims: [],
      adminClaimsTotal: 0,
      agents: [],
      stats: null,
    })
  },

  navigate: (screen) => set({ screen }),

  openClaim: (id) => set({ currentClaimId: id, screen: 'claim-detail' }),

  setMyClaims: (claims, total) => set({ myClaims: claims, myClaimsTotal: total }),

  setAdminClaims: (claims, total) =>
    set({ adminClaims: claims, adminClaimsTotal: total }),

  setAgents: (agents) => set({ agents }),

  setStats: (stats) => set({ stats }),

  updateUser: (patch) =>
    set((state) => {
      if (!state.user) return {}
      const updated = { ...state.user, ...patch }
      persistSession(state.token!, updated)
      return { user: updated }
    }),
}))
