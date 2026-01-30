import { SafetyLevel, CommandPattern, SafetyAnalysis } from '@/types'

export const DANGEROUS_PATTERNS: CommandPattern[] = [
  // Critical system destruction commands
  {
    pattern: /rm\s+-rf\s+\/($|\s|\.\*)/i,
    level: 'danger',
    reason: 'This will recursively and forcefully delete ALL files on the system. IRREVERSIBLE!',
  },
  {
    pattern: /rm\s+(-rf|-fr)\s+\/(boot|bin|sbin|lib|lib64|usr|etc|var)(\/|$)/i,
    level: 'danger',
    reason: 'Deleting critical system directories will render the system unbootable.',
  },
  {
    pattern: /mkfs\.[a-z0-9]+\s+\/dev\/[a-z0-9]+/i,
    level: 'danger',
    reason: 'Formatting a block device will destroy ALL data on it. IRREVERSIBLE!',
  },
  {
    pattern: /dd\s+if=.+\s+of=\/dev\/[a-z0-9]+/i,
    level: 'danger',
    reason: 'Direct disk write with dd can overwrite critical data or the entire disk.',
  },
  {
    pattern: />.+\/dev\/(sda|sdb|nvme|hd|vd)[a-z0-9]*/i,
    level: 'danger',
    reason: 'Redirecting output directly to a disk device will corrupt or destroy data.',
  },
  {
    pattern: /:\(\)\{\s*:\|:&\s*\};/i,
    level: 'danger',
    reason: 'Fork bomb - this will rapidly spawn processes until system crash.',
  },

  // Package manager dangerous commands
  {
    pattern: /pacman\s+-Scc/i,
    level: 'danger',
    reason: 'Clears ALL cached packages including those that might be needed for recovery.',
  },
  {
    pattern: /pacman\s+-Rdd?\s+.*(base|linux|systemd|glibc)/i,
    level: 'danger',
    reason: 'Removing core system packages will break the system.',
  },
  {
    pattern: /apt\s+(remove|purge)\s+.*(systemd|linux-image|grub)/i,
    level: 'danger',
    reason: 'Removing core system packages will render the system unbootable.',
  },
  {
    pattern: /dpkg\s+--remove.*(linux-image|grub)/i,
    level: 'danger',
    reason: 'Removing kernel or bootloader packages will break boot process.',
  },

  // Service/display manager commands
  {
    pattern: /systemctl\s+(stop|restart|disable)\s+(display-manager|sddm|gdm|lightdm)/i,
    level: 'caution',
    reason: 'Will terminate the current graphical session. Save your work first!',
  },
  {
    pattern: /systemctl\s+(stop|restart)\s+(NetworkManager|network|systemd-networkd)/i,
    level: 'caution',
    reason: 'Will interrupt network connectivity. Ensure you have alternative access if on SSH.',
  },
  {
    pattern: /systemctl\s+stop\s+ssh/i,
    level: 'caution',
    reason: 'Will terminate SSH service. Do not run on remote systems!',
  },

  // Permission changes
  {
    pattern: /chmod\s+-R?\s+777\s+\//i,
    level: 'danger',
    reason: 'Making entire filesystem world-writable is a massive security risk.',
  },
  {
    pattern: /chmod\s+777\s+\/(etc|usr|bin|sbin|lib)/i,
    level: 'danger',
    reason: 'Making system directories world-writable compromises system security.',
  },
  {
    pattern: /chown\s+-R\s+.+\s+\//i,
    level: 'danger',
    reason: 'Changing ownership of entire filesystem will break the system.',
  },

  // Disk operations
  {
    pattern: /fdisk\s+\/dev\/[a-z0-9]+/i,
    level: 'caution',
    reason: 'Disk partitioning can lead to data loss if done incorrectly.',
  },
  {
    pattern: /parted\s+\/dev\/[a-z0-9]+/i,
    level: 'caution',
    reason: 'Partition manipulation can destroy existing data.',
  },
  {
    pattern: /pvcreate\s+\/dev\/[a-z0-9]+/i,
    level: 'caution',
    reason: 'Creating physical volumes will modify disk metadata.',
  },

  // Kernel/module operations
  {
    pattern: /modprobe\s+-r\s+.*(nvidia|amdgpu|i915)/i,
    level: 'caution',
    reason: 'Removing graphics drivers may cause display issues.',
  },
  {
    pattern: /rmmod\s+.*(nvidia|amdgpu|i915)/i,
    level: 'caution',
    reason: 'Removing graphics drivers may cause display to fail.',
  },

  // Password/security
  {
    pattern: /passwd\s+root/i,
    level: 'caution',
    reason: 'Changing root password. Ensure you remember the new password!',
  },
  {
    pattern: /openssl\s+enc\s+-d/i,
    level: 'caution',
    reason: 'Decryption operation. Verify the source of encrypted data.',
  },

  // Database operations
  {
    pattern: /drop\s+database\s+/i,
    level: 'danger',
    reason: 'Dropping a database will delete all its data. IRREVERSIBLE!',
  },
  {
    pattern: /drop\s+table\s+/i,
    level: 'caution',
    reason: 'Dropping a table will delete all its data.',
  },

  // Recursively dangerous patterns
  {
    pattern: /find\s+.*-exec\s+rm/i,
    level: 'caution',
    reason: 'Mass deletion based on find criteria. Verify the search results first.',
  },
  {
    pattern: /find\s+.*-delete/i,
    level: 'caution',
    reason: 'Mass deletion based on find criteria. Verify the search results first.',
  },
]

export function analyzeCommandSafety(command: string): SafetyAnalysis {
  const detectedPatterns: string[] = []
  let highestLevel: SafetyLevel = 'safe'
  let primaryReason = ''

  for (const { pattern, level, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      detectedPatterns.push(pattern.source)

      // Update to higher severity level
      if (level === 'danger' || (level === 'caution' && highestLevel === 'safe')) {
        highestLevel = level
        primaryReason = reason
      }
    }
  }

  return {
    level: highestLevel,
    reason: primaryReason || (detectedPatterns.length > 0 ? 'Command contains potentially dangerous patterns.' : 'No dangerous patterns detected.'),
    detectedPatterns,
  }
}

export function extractCommandsFromText(text: string): string[] {
  const commands: string[] = []

  // Match code blocks with bash/shell/sh
  const codeBlockRegex = /```(?:bash|sh|shell|zsh)?\n([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const code = match[1].trim()
    // Split by lines and extract commands (lines starting with $ or sudo or common commands)
    const lines = code.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        commands.push(trimmed.replace(/^\$\s*/, ''))
      }
    }
  }

  // Also match inline code that looks like commands
  const inlineCodeRegex = /`([^`]+)`/g
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    const code = match[1].trim()
    // Heuristic: if it starts with common command prefixes
    if (/^(sudo|apt|pacman|yum|dnf|systemctl|journalctl|ls|cd|cat|grep|awk|sed|chmod|chown|rm|cp|mv|mkdir|curl|wget|ssh|git|docker|kubectl)/.test(code)) {
      commands.push(code)
    }
  }

  return commands
}

export function analyzeTextForSafety(text: string): SafetyAnalysis {
  const commands = extractCommandsFromText(text)

  if (commands.length === 0) {
    return {
      level: 'safe',
      reason: 'No commands detected in the text.',
      detectedPatterns: [],
    }
  }

  let highestLevel: SafetyLevel = 'safe'
  let allReasons: string[] = []
  let allPatterns: string[] = []

  for (const command of commands) {
    const analysis = analyzeCommandSafety(command)
    if (analysis.level !== 'safe') {
      if (analysis.level === 'danger' || (analysis.level === 'caution' && highestLevel === 'safe')) {
        highestLevel = analysis.level
      }
      allReasons.push(analysis.reason)
      allPatterns.push(...analysis.detectedPatterns)
    }
  }

  return {
    level: highestLevel,
    reason: allReasons.join(' ') || 'No dangerous patterns detected.',
    detectedPatterns: Array.from(new Set(allPatterns)),
  }
}

export function getSafetyColor(level: SafetyLevel): string {
  switch (level) {
    case 'safe':
      return 'text-terminal-green'
    case 'caution':
      return 'text-terminal-yellow'
    case 'danger':
      return 'text-terminal-red'
    default:
      return 'text-slate-400'
  }
}

export function getSafetyBgColor(level: SafetyLevel): string {
  switch (level) {
    case 'safe':
      return 'bg-terminal-green/10 border-terminal-green/30'
    case 'caution':
      return 'bg-terminal-yellow/10 border-terminal-yellow/30'
    case 'danger':
      return 'bg-terminal-red/10 border-terminal-red/30'
    default:
      return 'bg-slate-800/50 border-slate-700'
  }
}

export function getSafetyIcon(level: SafetyLevel): string {
  switch (level) {
    case 'safe':
      return 'ShieldCheck'
    case 'caution':
      return 'AlertTriangle'
    case 'danger':
      return 'ShieldAlert'
    default:
      return 'HelpCircle'
  }
}
