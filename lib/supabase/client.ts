'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Dummy storage removed to enable persistent sessions for JWT auth
// const dummyStorage = {
//   getItem: (key: string) => null,
//   setItem: (key: string, value: string) => { },
//   removeItem: (key: string) => { },
// }

export function createClient() {
  console.log('Initializing Supabase Client (Persistent Session)')
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const supabase = createClient()
