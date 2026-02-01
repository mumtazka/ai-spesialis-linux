import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function detectCodeLanguage(content: string): string {
  const patterns = {
    bash: /^(#!\/bin\/(bash|sh)|\$\s)/m,
    python: /^(#!\/usr\/bin\/env python|import |from |def |class )/m,
    javascript: /^(const |let |var |function |=> |import |export )/m,
    typescript: /^(interface |type |export (interface|type) )/m,
    yaml: /^[\w-]+:\s*\n/m,
    json: /^\s*[\[{]/m,
    dockerfile: /^(FROM|RUN|COPY|ADD|CMD|ENTRYPOINT|ENV)/m,
    sql: /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/im,
  }

  for (const [lang, pattern] of Object.entries(patterns)) {
    if (pattern.test(content)) return lang
  }

  return 'bash'
}

export function extractFilenameFromMarkdown(content: string): string | null {
  const match = content.match(/```[\w]*:(.+?)\n/)
  return match ? match[1].trim() : null
}

export function stripFilenameFromCodeBlock(content: string): string {
  return content.replace(/(```[\w]*):.+?\n/, '$1\n')
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
