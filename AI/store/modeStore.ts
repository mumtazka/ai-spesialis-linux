'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Mode } from '@/types'
import { getSystemPrompt } from '@/lib/prompts'

interface ModeState {
  mode: Mode
  setMode: (mode: Mode) => void
  toggleMode: () => void
  getSystemPrompt: () => string
  getModeColor: () => string
  getModeHexColor: () => string
}

export const useModeStore = create<ModeState>()(
  persist(
    (set, get) => ({
      mode: 'arch',

      setMode: (mode) => {
        set({ mode })
        // Dispatch event for components that need to react to mode changes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('modechange', { detail: mode }))
        }
      },

      toggleMode: () => {
        const newMode = get().mode === 'arch' ? 'ubuntu' : 'arch'
        set({ mode: newMode })
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('modechange', { detail: newMode }))
        }
      },

      getSystemPrompt: () => getSystemPrompt(get().mode),

      getModeColor: () => (get().mode === 'arch' ? 'terminal-green' : 'terminal-orange'),

      getModeHexColor: () => (get().mode === 'arch' ? '#00ff41' : '#e95420'),
    }),
    {
      name: 'linuxexpert-mode',
      version: 1,
    }
  )
)
