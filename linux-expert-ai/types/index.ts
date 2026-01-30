export type Mode = 'arch' | 'ubuntu'

export type SafetyLevel = 'safe' | 'caution' | 'danger'

export interface User {
  id: string
  email: string
  username?: string
  avatar_url?: string
  created_at: string
}

export interface SystemContext {
  id?: string
  user_id?: string
  distro_type: 'arch' | 'ubuntu-22.04' | 'ubuntu-24.04'
  kernel_version: string
  de_wm: string
  gpu: 'nvidia' | 'amd' | 'intel' | 'none'
  packages: string
  updated_at?: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  mode: Mode
  system_context_id?: string
  created_at: string
  updated_at?: string
}

export interface MessageFile {
  name: string
  type: string
  size: number
  url?: string
  content?: string
}

export interface Message {
  id: string
  session_id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: MessageFile[]
  metadata?: {
    safetyLevel?: SafetyLevel
    detectedCommands?: string[]
    reasoning?: string
    tokens?: number
  }
  created_at: string
}

export interface ArchNews {
  id: string
  title: string
  content: string
  category: 'Testing' | 'Stable' | 'Security' | 'News' | 'Update'
  severity: 'critical' | 'high' | 'medium' | 'low'
  published_at: string
  source_url?: string
}

export interface SafetyAnalysis {
  level: SafetyLevel
  reason: string
  detectedPatterns: string[]
}

export interface CommandPattern {
  pattern: RegExp
  level: SafetyLevel
  reason: string
}

export interface ChatRequest {
  messages: Message[]
  mode: Mode
  system_context?: SystemContext
}

export interface ChatResponse {
  message: Message
  safetyAnalysis?: SafetyAnalysis
}

export interface NewsItem {
  id: string
  title: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  published_at: string
  summary?: string
}

export interface FileUpload {
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
}
