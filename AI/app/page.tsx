'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { SystemContext as SystemContextType } from '@/types'
import { LoginScreen } from '@/components/LoginScreen'
import { ProfileSetupForm } from '@/components/ProfileSetupForm'
import { TerminalChat } from '@/components/TerminalChat'

export default function HomePage() {
  const [username, setUsername] = useState<string | null>(null)
  const [systemContext, setSystemContext] = useState<SystemContextType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      const storedUser = localStorage.getItem('linux_ai_username')
      if (storedUser) {
        await handleLogin(storedUser)
      } else {
        setIsLoading(false)
      }
    }
    loadSession()
  }, [])

  const handleLogin = async (inputUsername: string) => {
    setIsLoading(true)
    try {
      // Check if user exists, if not create
      const { data: existingUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', inputUsername)
        .single()

      if (!existingUser) {
        // Create new user
        const { error: createError } = await (supabase
          .from('app_users') as any)
          .insert({ username: inputUsername })

        if (createError) throw createError
      }

      // Load profile
      const { data: profile } = await supabase
        .from('user_systems')
        .select('*')
        .eq('user_id', inputUsername)
        .single()

      setUsername(inputUsername)
      if (profile) {
        setSystemContext(profile as any) // Type assertion due to JSON field mismatch in generated types vs frontend types
      }

      localStorage.setItem('linux_ai_username', inputUsername)
    } catch (error) {
      console.error('Login error:', error)
      alert('Failed to login. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async (data: any) => {
    if (!username) return
    setIsSaving(true)

    try {
      // First check if profile exists
      const { data: existing } = await (supabase
        .from('user_systems') as any)
        .select('user_id')
        .eq('user_id', username)
        .single()

      let error;

      if (existing) {
        // Update existing profile
        const result = await (supabase
          .from('user_systems') as any)
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', username)
        error = result.error
      } else {
        // Insert new profile
        const result = await (supabase
          .from('user_systems') as any)
          .insert({
            user_id: username,
            ...data,
            updated_at: new Date().toISOString()
          })
        error = result.error
      }

      if (error) throw error

      setSystemContext(data)
    } catch (error) {
      console.error('Save profile error:', error)
      alert('Failed to save profile.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('linux_ai_username')
    setUsername(null)
    setSystemContext(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-green" />
          <p className="text-sm text-slate-500">Initializing Terminal...</p>
        </div>
      </div>
    )
  }

  if (!username) {
    return <LoginScreen onLogin={handleLogin} isLoading={isLoading} />
  }

  // if (!systemContext) {
  //   return (
  //     <ProfileSetupForm
  //       username={username}
  //       onSave={handleSaveProfile}
  //       isSaving={isSaving}
  //     />
  //   )
  // }

  // Mock user object for compatibility with TerminalChat
  const userObj = {
    id: username,
    email: `${username}@local`,
    username: username,
    avatar_url: undefined
  }

  return (
    <TerminalChat
      user={userObj}
      initialSystemContext={systemContext}
      initialNews={[]} // News disabled for now
      onLogout={handleLogout}
      onSaveSystemContext={handleSaveProfile}
    />
  )
}
