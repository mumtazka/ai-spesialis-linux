'use client'

import { useState, useEffect } from 'react'
import { TerminalChat } from '@/components/TerminalChat'
import { supabase } from '@/lib/supabase/client'
import { SystemContext as SystemContextType, ArchNews } from '@/types'

// Mock user for demo (remove in production)
const MOCK_USER = {
  id: 'demo-user',
  email: 'demo@linuxexpert.ai',
  username: 'demo',
}

// Mock news data
const MOCK_NEWS: ArchNews[] = [
  {
    id: '1',
    title: 'nvidia 545.29.06-1 requires manual intervention',
    content: 'The nvidia package has been updated to version 545.29.06-1. Users may need to rebuild their initramfs after the update.',
    category: 'Update',
    severity: 'high',
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://archlinux.org/news/',
  },
  {
    id: '2',
    title: 'PHP 8.3 enters [testing]',
    content: 'PHP 8.3.0 has been added to the testing repository. Please test and report any issues.',
    category: 'Testing',
    severity: 'medium',
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://archlinux.org/news/',
  },
  {
    id: '3',
    title: 'Critical OpenSSL vulnerability patched',
    content: 'A critical vulnerability in OpenSSL has been patched. Update immediately.',
    category: 'Security',
    severity: 'critical',
    published_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://security.archlinux.org/',
  },
]

export default function HomePage() {
  const [user, setUser] = useState<typeof MOCK_USER | null>(MOCK_USER)
  const [systemContext, setSystemContext] = useState<SystemContextType | null>(null)
  const [news, setNews] = useState<ArchNews[]>(MOCK_NEWS)
  const [isLoading, setIsLoading] = useState(true)

  // Check auth session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            username: session.user.user_metadata?.username,
          })

          // Load user's system context
          const { data: contextData } = await (supabase.from('user_systems') as any)
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          if (contextData) {
            setSystemContext(contextData as SystemContextType)
          }
        }
      } catch (error) {
        console.error('Error checking session:', error)
        // Use mock user for demo
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            username: session.user.user_metadata?.username,
          })
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Subscribe to realtime news updates
  useEffect(() => {
    // This would be replaced with actual Supabase realtime subscription
    const channel = supabase
      .channel('arch_news')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arch_news' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNews((prev) => [payload.new as ArchNews, ...prev].slice(0, 20))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleSaveSystemContext = async (data: SystemContextType) => {
    if (!user) return

    const { error } = await (supabase.from('user_systems') as any)
      .upsert({
        ...data,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error saving system context:', error)
      throw error
    }

    setSystemContext(data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terminal-green" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <TerminalChat
      user={user}
      initialSystemContext={systemContext}
      initialNews={news}
      onLogout={handleLogout}
      onSaveSystemContext={handleSaveSystemContext}
    />
  )
}
