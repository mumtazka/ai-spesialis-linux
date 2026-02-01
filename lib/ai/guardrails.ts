
// Command Injection Detection & Safety Guardrails

export const DANGEROUS_PATTERNS = [
    /rm\s+-rf\s+\//,             // Root deletion
    /mkfs\.\w+/,                 // Filesystem formatting
    /dd\s+if=.*of=\/dev\/(sda|hd|disk|nvme)/, // Direct disk write
    />?\s*\/dev\/null/,          // Redirection to null (suspicious in some contexts)
    /:\(\)\s*{\s*:\|:&\s*};:/,   // Fork bomb
    /wget.*\|\s*(sh|bash)/,      // Pipe to shell
    /curl.*\|\s*(sh|bash)/,      // Pipe to shell
    /chmod\s+777\s+\//,          // Unsafe permissions on root
    /mv\s+\/\w+\s+\/dev\/null/   // Moving system dirs to null
];

export interface SafetyCheck {
    safe: boolean;
    warnings: string[];
}

export function analyzeCommandSafety(text: string): SafetyCheck {
    const warnings: string[] = [];

    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(text)) {
            warnings.push(`Detected potentially destructive pattern: ${pattern.toString()}`);
        }
    }

    // Check for suspicious sudo usage without explanation (simple heuristic)
    if (text.includes('sudo ') && !text.includes('#')) {
        // warnings.push('Sudo usage detected. Ensure you understand the command.');
    }

    return {
        safe: warnings.length === 0,
        warnings
    };
}
