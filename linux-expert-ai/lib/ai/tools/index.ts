/**
 * Tool Registry
 * Central management for AI-callable tools
 * 
 * IMPORTANT: Tools generate suggestions and analysis only
 * They do NOT execute commands on the host system
 */

import { Mode } from '@/types'
import { analyzeCommandSafety } from '../../commands'

export interface ToolResult {
    success: boolean
    output: string
    metadata?: Record<string, unknown>
}

export interface Tool {
    name: string
    description: string
    execute: (input: string, mode: Mode) => Promise<ToolResult>
}

// Tool registry
const tools = new Map<string, Tool>()

/**
 * Register a tool
 */
export function registerTool(tool: Tool): void {
    tools.set(tool.name, tool)
}

/**
 * Get a tool by name
 */
export function getTool(name: string): Tool | undefined {
    return tools.get(name)
}

/**
 * Get all registered tools
 */
export function getAllTools(): Tool[] {
    return Array.from(tools.values())
}

/**
 * Execute a tool by name
 */
export async function executeTool(
    name: string,
    input: string,
    mode: Mode
): Promise<ToolResult> {
    const tool = tools.get(name)

    if (!tool) {
        return {
            success: false,
            output: `Tool "${name}" not found`,
        }
    }

    try {
        return await tool.execute(input, mode)
    } catch (error) {
        return {
            success: false,
            output: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
    }
}

// ============================================
// Built-in Tools
// ============================================

/**
 * Shell Command Generator
 * Generates safe shell commands based on user intent
 * Does NOT execute - only suggests
 */
registerTool({
    name: 'shell_generator',
    description: 'Generate shell commands for common Linux tasks',
    async execute(intent: string, mode: Mode): Promise<ToolResult> {
        // This tool helps format commands based on the mode
        const packageManager = mode === 'arch' ? 'pacman' : 'apt'

        const commonPatterns: Record<string, { arch: string; ubuntu: string }> = {
            update: {
                arch: 'sudo pacman -Syu',
                ubuntu: 'sudo apt update && sudo apt upgrade -y',
            },
            install: {
                arch: 'sudo pacman -S <package>',
                ubuntu: 'sudo apt install <package>',
            },
            remove: {
                arch: 'sudo pacman -R <package>',
                ubuntu: 'sudo apt remove <package>',
            },
            search: {
                arch: 'pacman -Ss <query>',
                ubuntu: 'apt search <query>',
            },
            info: {
                arch: 'pacman -Qi <package>',
                ubuntu: 'apt show <package>',
            },
            clean: {
                arch: 'sudo pacman -Sc',
                ubuntu: 'sudo apt autoremove && sudo apt autoclean',
            },
            services: {
                arch: 'systemctl list-units --type=service',
                ubuntu: 'systemctl list-units --type=service',
            },
            logs: {
                arch: 'journalctl -xe',
                ubuntu: 'journalctl -xe',
            },
        }

        // Find matching pattern
        const intentLower = intent.toLowerCase()
        for (const [key, commands] of Object.entries(commonPatterns)) {
            if (intentLower.includes(key)) {
                const command = mode === 'arch' ? commands.arch : commands.ubuntu
                const safety = analyzeCommandSafety(command)

                return {
                    success: true,
                    output: command,
                    metadata: {
                        safetyLevel: safety.level,
                        safetyReason: safety.reason,
                    },
                }
            }
        }

        return {
            success: true,
            output: `Use ${packageManager} for package management. Describe your specific need for targeted command suggestions.`,
        }
    },
})

/**
 * Log Analyzer
 * Parses and analyzes common Linux log formats
 */
registerTool({
    name: 'log_analyzer',
    description: 'Analyze Linux system logs and identify issues',
    async execute(logContent: string): Promise<ToolResult> {
        // Error pattern detection
        const patterns = [
            { regex: /error/gi, severity: 'error', name: 'Error' },
            { regex: /failed/gi, severity: 'error', name: 'Failure' },
            { regex: /warning/gi, severity: 'warning', name: 'Warning' },
            { regex: /denied/gi, severity: 'error', name: 'Permission Denied' },
            { regex: /timeout/gi, severity: 'warning', name: 'Timeout' },
            { regex: /oom|out of memory/gi, severity: 'critical', name: 'Out of Memory' },
            { regex: /segfault|segmentation fault/gi, severity: 'critical', name: 'Segfault' },
            { regex: /kernel panic/gi, severity: 'critical', name: 'Kernel Panic' },
        ]

        const findings: { pattern: string; count: number; severity: string }[] = []

        for (const pattern of patterns) {
            const matches = logContent.match(pattern.regex)
            if (matches && matches.length > 0) {
                findings.push({
                    pattern: pattern.name,
                    count: matches.length,
                    severity: pattern.severity,
                })
            }
        }

        if (findings.length === 0) {
            return {
                success: true,
                output: 'No significant issues detected in the log content.',
            }
        }

        // Sort by severity
        const severityOrder = { critical: 0, error: 1, warning: 2 }
        findings.sort(
            (a, b) =>
                (severityOrder[a.severity as keyof typeof severityOrder] || 3) -
                (severityOrder[b.severity as keyof typeof severityOrder] || 3)
        )

        const summary = findings
            .map((f) => `- ${f.pattern}: ${f.count} occurrence(s) [${f.severity.toUpperCase()}]`)
            .join('\n')

        return {
            success: true,
            output: `## Log Analysis Summary\n\n${summary}`,
            metadata: { findings },
        }
    },
})

/**
 * Config Inspector
 * Validates and inspects Linux configuration files
 */
registerTool({
    name: 'config_inspector',
    description: 'Inspect and validate Linux configuration files',
    async execute(configContent: string): Promise<ToolResult> {
        const issues: string[] = []
        const suggestions: string[] = []

        // Common config issues detection
        const lines = configContent.split('\n')

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()

            // Skip comments and empty lines
            if (line.startsWith('#') || line === '') continue

            // Check for common issues
            if (line.includes('password') && !line.includes('#')) {
                issues.push(`Line ${i + 1}: Possible hardcoded password detected`)
            }

            if (line.includes('chmod 777') || line.includes('chmod 666')) {
                issues.push(`Line ${i + 1}: Overly permissive file permissions`)
            }

            if (line.includes('0.0.0.0') || line.includes('EXPOSE')) {
                suggestions.push(`Line ${i + 1}: Service exposed on all interfaces - consider binding to specific IP`)
            }

            if (line.includes('root') && line.includes('password')) {
                issues.push(`Line ${i + 1}: Root credentials may be exposed`)
            }
        }

        let output = '## Configuration Analysis\n\n'

        if (issues.length > 0) {
            output += `### Issues Found\n${issues.map((i) => `- ⚠️ ${i}`).join('\n')}\n\n`
        }

        if (suggestions.length > 0) {
            output += `### Suggestions\n${suggestions.map((s) => `- 💡 ${s}`).join('\n')}\n\n`
        }

        if (issues.length === 0 && suggestions.length === 0) {
            output += 'No obvious issues detected. Configuration looks reasonable.\n'
        }

        return {
            success: true,
            output,
            metadata: { issueCount: issues.length, suggestionCount: suggestions.length },
        }
    },
})
