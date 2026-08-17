'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { LoginScreen } from '@/components/app/LoginScreen'
import { AgentDashboard } from '@/components/app/AgentDashboard'
import { NewClaimForm } from '@/components/app/NewClaimForm'
import { MyClaimsList } from '@/components/app/MyClaimsList'
import { ClaimDetail } from '@/components/app/ClaimDetail'
import { AdminDashboard } from '@/components/app/AdminDashboard'
import { AdminClaims } from '@/components/app/AdminClaims'
import { AdminAgents } from '@/components/app/AdminAgents'
import { AdminSubjects } from '@/components/app/AdminSubjects'
import { GraduationCap } from 'lucide-react'

export default function Home() {
  const hydrating = useAppStore((s) => s.hydrating)
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)
  const screen = useAppStore((s) => s.screen)
  const hydrate = useAppStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (hydrating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <GraduationCap className="h-7 w-7" />
        </div>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated || screen === 'login') {
    return <LoginScreen />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-app-bg)]">
      <main className="flex-1 w-full mx-auto max-w-2xl px-4 py-5 sm:py-6">
        {renderScreen(screen)}
      </main>
      <footer className="mt-auto border-t bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            Remedial School Affiliate Program
          </span>
          <span>Secure · v1.0</span>
        </div>
      </footer>
    </div>
  )
}

function renderScreen(screen: string) {
  switch (screen) {
    case 'agent-dashboard':
      return <AgentDashboard />
    case 'new-claim':
      return <NewClaimForm />
    case 'my-claims':
      return <MyClaimsList />
    case 'claim-detail':
      return <ClaimDetail />
    case 'admin-dashboard':
      return <AdminDashboard />
    case 'admin-claims':
      return <AdminClaims />
    case 'admin-agents':
      return <AdminAgents />
    case 'admin-subjects':
      return <AdminSubjects />
    default:
      return <LoginScreen />
  }
}
