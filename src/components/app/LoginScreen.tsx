'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { GraduationCap, LogIn, AlertCircle, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { apiRequest } from '@/lib/api-client'
import { useAppStore } from '@/lib/store'
import type { User } from '@/lib/types'

interface LoginResponse {
  token: string
  user: User
}

export function LoginScreen() {
  const login = useAppStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      setError('Please enter your email')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }

    setLoading(true)
    try {
      const data = await apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, pin }),
        auth: false,
      })
      toast.success(`Welcome back, ${data.user.name}!`)
      login(data.token, data.user)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-screen-in">
        {/* Brand */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Remedial School</h1>
            <p className="text-sm text-muted-foreground">Affiliate Agent Portal</p>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <LogIn className="h-4.5 w-4.5 text-primary" />
              Sign In
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your email and 4-digit PIN to continue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">4-Digit PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  disabled={loading}
                  className="h-11 tracking-[0.5em] text-center text-lg"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4.5 w-4.5" />
                    Sign In
                  </>
                )}
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-primary hover:underline pt-1"
                  >
                    Forgot PIN?
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" />
                      Forgot your PIN?
                    </DialogTitle>
                    <DialogDescription className="text-left pt-2">
                      For security reasons, PINs cannot be reset from this portal. Please
                      contact your program administrator to receive a new PIN.
                    </DialogDescription>
                    <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                      <p className="font-medium">Contact Admin</p>
                      <p className="text-muted-foreground mt-1">
                        Reach out via WhatsApp or email and provide your registered email
                        address and agent ID. The admin can verify your identity and issue
                        a new PIN.
                      </p>
                    </div>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Demo: admin@remedialschool.com / 1234 · agent@demo.com / 1234
        </p>
      </div>
    </div>
  )
}
