// Supabase Database Types
// Generated types for your Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_systems: {
        Row: {
          id: string
          user_id: string
          distro_type: 'arch' | 'ubuntu-22.04' | 'ubuntu-24.04'
          kernel_version: string | null
          de_wm: string | null
          gpu: 'nvidia' | 'amd' | 'intel' | 'none' | null
          packages: Json
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          distro_type: 'arch' | 'ubuntu-22.04' | 'ubuntu-24.04'
          kernel_version?: string | null
          de_wm?: string | null
          gpu?: 'nvidia' | 'amd' | 'intel' | 'none' | null
          packages?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          distro_type?: 'arch' | 'ubuntu-22.04' | 'ubuntu-24.04'
          kernel_version?: string | null
          de_wm?: string | null
          gpu?: 'nvidia' | 'amd' | 'intel' | 'none' | null
          packages?: Json
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          mode: 'arch' | 'ubuntu'
          system_context_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          mode: 'arch' | 'ubuntu'
          system_context_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          mode?: 'arch' | 'ubuntu'
          system_context_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          files: Json
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          files?: Json
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          files?: Json
          metadata?: Json
          created_at?: string
        }
      }
      arch_news: {
        Row: {
          id: string
          title: string
          content: string
          category: 'Testing' | 'Stable' | 'Security' | 'News' | 'Update'
          severity: 'critical' | 'high' | 'medium' | 'low'
          published_at: string
          source_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: 'Testing' | 'Stable' | 'Security' | 'News' | 'Update'
          severity?: 'critical' | 'high' | 'medium' | 'low'
          published_at?: string
          source_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: 'Testing' | 'Stable' | 'Security' | 'News' | 'Update'
          severity?: 'critical' | 'high' | 'medium' | 'low'
          published_at?: string
          source_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
