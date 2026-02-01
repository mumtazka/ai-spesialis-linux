import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Use streaming endpoint for better UX
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============================================================================
// LINUX NEWS SYSTEM - Multi-source aggregation
// ============================================================================

interface NewsItem {
    title: string;
    date: string;
    source: string;
    url: string;
    summary?: string;
    severity?: 'info' | 'warning' | 'critical';
    distro: string;
}

// News cache with TTL
const newsCache = new Map<string, { items: NewsItem[], fetchedAt: number }>();
const NEWS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// RSS Feed sources for major Linux distros
const NEWS_SOURCES: Record<string, { url: string; type: 'rss' | 'json' | 'html' }> = {
    arch: { url: 'https://archlinux.org/feeds/news/', type: 'rss' },
    ubuntu: { url: 'https://ubuntu.com/blog/feed', type: 'rss' },
    fedora: { url: 'https://fedoramagazine.org/feed/', type: 'rss' },
    debian: { url: 'https://www.debian.org/News/news', type: 'html' },
    opensuse: { url: 'https://news.opensuse.org/feed/', type: 'rss' },
    manjaro: { url: 'https://forum.manjaro.org/c/announcements/8.rss', type: 'rss' },
    linux_kernel: { url: 'https://www.kernel.org/feeds/kdist.xml', type: 'rss' },
    nixos: { url: 'https://nixos.org/blog/announcements-rss.xml', type: 'rss' },
};

async function fetchRSSNews(source: string, url: string): Promise<NewsItem[]> {
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'LinuxExpertAI/1.0' }
        });

        if (!response.ok) return [];

        const text = await response.text();
        const items: NewsItem[] = [];

        // Simple RSS parsing (no external dependencies)
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/;
        const linkRegex = /<link>(.*?)<\/link>|<link[^>]*href="([^"]*)"[^>]*\/>/;
        const dateRegex = /<pubDate>(.*?)<\/pubDate>|<dc:date>(.*?)<\/dc:date>|<updated>(.*?)<\/updated>/;
        const descRegex = /<description><!\[CDATA\[([\s\S]*?)\]\]>|<description>([\s\S]*?)<\/description>/;

        let match;
        let count = 0;
        while ((match = itemRegex.exec(text)) !== null && count < 10) {
            const item = match[1];
            const titleMatch = titleRegex.exec(item);
            const linkMatch = linkRegex.exec(item);
            const dateMatch = dateRegex.exec(item);
            const descMatch = descRegex.exec(item);

            const title = titleMatch?.[1] || titleMatch?.[2] || 'No title';
            const url = linkMatch?.[1] || linkMatch?.[2] || '';
            const dateStr = dateMatch?.[1] || dateMatch?.[2] || dateMatch?.[3] || '';
            const desc = descMatch?.[1] || descMatch?.[2] || '';

            // Detect severity based on keywords
            let severity: 'info' | 'warning' | 'critical' = 'info';
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes('security') || lowerTitle.includes('vulnerability') || lowerTitle.includes('cve')) {
                severity = 'critical';
            } else if (lowerTitle.includes('breaking') || lowerTitle.includes('migration') || lowerTitle.includes('manual intervention')) {
                severity = 'warning';
            }

            items.push({
                title: title.trim(),
                date: formatNewsDate(dateStr),
                source: source,
                url: url.trim(),
                summary: cleanHTML(desc).substring(0, 200),
                severity,
                distro: source
            });
            count++;
        }

        return items;
    } catch (error) {
        console.error(`Failed to fetch ${source} news:`, error);
        return [];
    }
}

function formatNewsDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

function cleanHTML(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

async function getAllLinuxNews(targetDistro?: string): Promise<NewsItem[]> {
    const cacheKey = targetDistro || 'all';
    const cached = newsCache.get(cacheKey);

    if (cached && (Date.now() - cached.fetchedAt) < NEWS_CACHE_TTL) {
        return cached.items;
    }

    const sourcesToFetch = targetDistro
        ? { [targetDistro.toLowerCase()]: NEWS_SOURCES[targetDistro.toLowerCase()] }
        : NEWS_SOURCES;

    const newsPromises = Object.entries(sourcesToFetch)
        .filter(([_, source]) => source?.type === 'rss')
        .map(([name, source]) => fetchRSSNews(name, source.url));

    const results = await Promise.allSettled(newsPromises);
    const allNews: NewsItem[] = [];

    for (const result of results) {
        if (result.status === 'fulfilled') {
            allNews.push(...result.value);
        }
    }

    // Sort by date (newest first)
    allNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Cache the results
    newsCache.set(cacheKey, { items: allNews, fetchedAt: Date.now() });

    return allNews;
}

function formatNewsForContext(news: NewsItem[], limit = 15): string {
    if (news.length === 0) return 'No recent news available.';

    const today = new Date().toISOString().split('T')[0];

    return news.slice(0, limit).map(item => {
        const severityIcon = item.severity === 'critical' ? '🚨' :
            item.severity === 'warning' ? '⚠️' : '📰';
        return `${severityIcon} [${item.date}] [${item.source.toUpperCase()}] ${item.title}${item.summary ? '\n   → ' + item.summary : ''}`;
    }).join('\n\n');
}

// ============================================================================
// WEB SEARCH / GROUNDING SYSTEM
// ============================================================================

interface SearchResult {
    title: string;
    snippet: string;
    url: string;
}

async function searchWeb(query: string, apiKey: string): Promise<SearchResult[]> {
    // Use Gemini with Google Search grounding
    const groundingRequest = {
        contents: [{
            role: 'user',
            parts: [{ text: `Search for the latest information about: ${query}. Return factual, up-to-date information with sources.` }]
        }],
        tools: [{
            googleSearch: {}
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
        }
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(groundingRequest)
            }
        );

        if (!response.ok) {
            console.error('Search grounding failed:', await response.text());
            return [];
        }

        const data = await response.json();

        // Extract grounding metadata if available
        const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
        const searchResults: SearchResult[] = [];

        if (groundingMetadata?.groundingChunks) {
            for (const chunk of groundingMetadata.groundingChunks) {
                if (chunk.web) {
                    searchResults.push({
                        title: chunk.web.title || 'Web Result',
                        snippet: chunk.web.uri || '',
                        url: chunk.web.uri || ''
                    });
                }
            }
        }

        // Also get the text response
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return searchResults.length > 0 ? searchResults : [{
            title: 'Search Result',
            snippet: textContent.substring(0, 500),
            url: ''
        }];
    } catch (error) {
        console.error('Web search error:', error);
        return [];
    }
}

// Detect if query needs web search
function needsWebSearch(message: string): { needed: boolean; query?: string } {
    const searchTriggers = [
        /latest\s+(news|update|version|release)/i,
        /what('s| is) new in/i,
        /current (version|status) of/i,
        /how to .* in 202[4-9]/i,
        /is there .* update/i,
        /breaking changes? (in|for)/i,
        /search (for|about)/i,
        /find (information|docs|documentation)/i,
        /what happened (to|with)/i,
        /any (issues?|bugs?) with/i,
    ];

    for (const trigger of searchTriggers) {
        if (trigger.test(message)) {
            // Extract search query from message
            const query = message.replace(/^(please |can you |could you )/i, '').trim();
            return { needed: true, query };
        }
    }

    return { needed: false };
}

// ============================================================================
// GITHUB REPOSITORY SEARCH & README READING
// ============================================================================

interface GitHubRepo {
    name: string;
    full_name: string;
    description: string;
    html_url: string;
    stargazers_count: number;
    language: string;
    topics: string[];
    updated_at: string;
    readme?: string;
}

// Detect if query mentions GitHub or a repo
function detectGitHubQuery(message: string): { isGitHub: boolean; repoName?: string; searchQuery?: string } {
    const lowerMsg = message.toLowerCase();

    // Direct repo mention pattern: owner/repo or github.com/owner/repo
    const repoPattern = /(?:github\.com\/)?([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/i;
    const repoMatch = message.match(repoPattern);

    if (repoMatch) {
        return { isGitHub: true, repoName: repoMatch[1] };
    }

    // GitHub search keywords
    const githubKeywords = [
        'github', 'github repo', 'repository', 'readme',
        'open source', 'project on github', 'check github',
        'find on github', 'github search'
    ];

    for (const keyword of githubKeywords) {
        if (lowerMsg.includes(keyword)) {
            // Extract potential search term
            const searchTermMatch = message.match(/(?:github|repo(?:sitory)?|readme|project)\s+(?:for\s+)?([a-zA-Z0-9_\s-]+)/i);
            return {
                isGitHub: true,
                searchQuery: searchTermMatch?.[1]?.trim() || message.replace(/github|repo|readme/gi, '').trim()
            };
        }
    }

    return { isGitHub: false };
}

// Search GitHub repositories
async function searchGitHubRepos(query: string): Promise<GitHubRepo[]> {
    try {
        const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`;

        const response = await fetch(searchUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LinuxExpertAI/1.0'
            }
        });

        if (!response.ok) {
            console.error('GitHub search failed:', response.status);
            return [];
        }

        const data = await response.json();

        return (data.items || []).map((repo: any) => ({
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || 'No description',
            html_url: repo.html_url,
            stargazers_count: repo.stargazers_count,
            language: repo.language || 'Unknown',
            topics: repo.topics || [],
            updated_at: repo.updated_at
        }));
    } catch (error) {
        console.error('GitHub search error:', error);
        return [];
    }
}

// Fetch README from a GitHub repo
async function fetchGitHubReadme(repoFullName: string): Promise<string | null> {
    try {
        const readmeUrl = `https://api.github.com/repos/${repoFullName}/readme`;

        const response = await fetch(readmeUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LinuxExpertAI/1.0'
            }
        });

        if (!response.ok) {
            console.error('README fetch failed:', response.status);
            return null;
        }

        const data = await response.json();

        // Decode base64 content
        if (data.content && data.encoding === 'base64') {
            const decoded = atob(data.content.replace(/\n/g, ''));
            // Limit to first 4000 chars to not overwhelm context
            return decoded.substring(0, 4000);
        }

        return null;
    } catch (error) {
        console.error('README fetch error:', error);
        return null;
    }
}

// Get full repo info with README
async function getGitHubRepoInfo(repoFullName: string): Promise<GitHubRepo | null> {
    try {
        const repoUrl = `https://api.github.com/repos/${repoFullName}`;

        const response = await fetch(repoUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LinuxExpertAI/1.0'
            }
        });

        if (!response.ok) {
            return null;
        }

        const repo = await response.json();
        const readme = await fetchGitHubReadme(repoFullName);

        return {
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description || 'No description',
            html_url: repo.html_url,
            stargazers_count: repo.stargazers_count,
            language: repo.language || 'Unknown',
            topics: repo.topics || [],
            updated_at: repo.updated_at,
            readme: readme || undefined
        };
    } catch (error) {
        console.error('Repo info fetch error:', error);
        return null;
    }
}

// Format GitHub info for AI context
function formatGitHubContext(repos: GitHubRepo[]): string {
    if (repos.length === 0) return '';

    return repos.map(repo => {
        let info = `
📦 **${repo.full_name}** (⭐ ${repo.stargazers_count})
   Language: ${repo.language} | Updated: ${new Date(repo.updated_at).toLocaleDateString()}
   URL: ${repo.html_url}
   Description: ${repo.description}
   Topics: ${repo.topics.join(', ') || 'None'}`;

        if (repo.readme) {
            info += `\n\n   📖 README CONTENT:\n   ${repo.readme.substring(0, 2000).replace(/\n/g, '\n   ')}`;
        }

        return info;
    }).join('\n\n---\n');
}

// ============================================================================
// RATE LIMITING
// ============================================================================

const rateLimitMap = new Map<string, { count: number, resetTime: number, tier: 'free' | 'pro' }>();
const LIMITS = {
    free: { requests: 15, window: 60 * 1000 },
    pro: { requests: 100, window: 60 * 1000 }
};

// ============================================================================
// SAFETY GUARDRAILS
// ============================================================================

const SAFETY_PATTERNS = {
    destructive: [
        /rm\s+-rf\s+\//,
        /mkfs\.\w+/,
        /dd\s+if=.*of=\/dev\/(sda|hd|disk|nvme)/,
        /:\(\)\s*{\s*:\|:&\s*};:/,
        /wget.*\|\s*(sh|bash)/,
        /curl.*\|\s*(sh|bash)/
    ],
    config_critical: [
        /\/etc\/(passwd|shadow|sudoers)/,
        /chmod\s+-R\s+777\s+\//
    ]
};

function checkSafety(text: string, context?: any): { safe: boolean; reason?: string } {
    for (const pattern of SAFETY_PATTERNS.destructive) {
        if (pattern.test(text)) {
            return { safe: false, reason: "Destructive system command detected" };
        }
    }

    if (context?.expertise_level === 'beginner') {
        for (const pattern of SAFETY_PATTERNS.config_critical) {
            if (pattern.test(text)) {
                return { safe: false, reason: "Critical config blocked for beginner" };
            }
        }
    }

    return { safe: true };
}

// ============================================================================
// SYSTEM PROMPT BUILDER - With Live News & Search Context
// ============================================================================

function getPackageManager(distro: string): string {
    const pm: Record<string, string> = {
        'ubuntu': 'apt', 'debian': 'apt', 'fedora': 'dnf', 'arch': 'pacman',
        'manjaro': 'pacman', 'opensuse': 'zypper', 'alpine': 'apk', 'void': 'xbps',
        'gentoo': 'emerge', 'nixos': 'nix'
    };
    return pm[distro.toLowerCase()] || 'package manager';
}

function getInitSystem(distro: string): string {
    const init: Record<string, string> = {
        'ubuntu': 'systemd', 'debian': 'systemd', 'fedora': 'systemd',
        'arch': 'systemd', 'alpine': 'openrc', 'void': 'runit', 'gentoo': 'openrc'
    };
    return init[distro.toLowerCase()] || 'systemd';
}

async function buildAdvancedSystemPrompt(
    context: any,
    news: NewsItem[],
    searchResults?: SearchResult[]
): Promise<string> {
    const distro = context?.distro_type || 'Unknown Linux';
    const version = context?.distro_version || '';
    const wm = context?.de_wm || 'Unknown DE/WM';
    const driver = context?.gpu_driver || context?.gpu || 'Unknown';
    const shell = context?.default_shell || 'bash';
    const expertise = context?.expertise_level || 'intermediate';
    const notes = context?.additional_setup_notes || '';
    const packages = context?.key_packages || '';

    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Format news for context
    const newsContext = formatNewsForContext(
        news.filter(n => n.distro.toLowerCase() === distro.toLowerCase() || distro === 'Unknown Linux'),
        10
    );

    // Format search results if available
    const searchContext = searchResults?.length
        ? `\n## LIVE SEARCH RESULTS\n${searchResults.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`
        : '';

    return `You are LinuxExpert AI - an elite Linux Systems Architect with real-time knowledge.

## CURRENT DATE & TIME
📅 ${currentDate} ${currentTime} UTC

## USER SYSTEM PROFILE (Auto-loaded from database)
┌─────────────────────────────────────
│ Distribution: ${distro} ${version}
│ Desktop/WM:   ${wm}
│ GPU Driver:   ${driver}
│ Default Shell: ${shell}
│ Expertise:    ${expertise}
│ Key Packages: ${packages || 'Not specified'}
│ Notes:        ${notes || 'None'}
└─────────────────────────────────────

## LIVE LINUX NEWS (Last updated: ${currentDate})
${newsContext}

${searchContext}

## CORE DIRECTIVES

### 1. REAL-TIME AWARENESS
- You have access to LIVE news feeds from major Linux distributions
- Always check if there are relevant breaking changes or updates in the news above
- If a user asks about updates/upgrades, reference actual news items with dates
- Warn about known issues from recent news

### 2. DISTRO-SPECIFIC COMMANDS
- Package Manager: ${getPackageManager(distro)}
- Init System: ${getInitSystem(distro)}
- NEVER give generic commands. Always use ${distro}-specific syntax
- Include version-specific considerations for ${version}

### 3. STRUCTURED REASONING
For every technical question:
1. **Analyze** - Understand what the user is trying to achieve
2. **Context Check** - How does their ${distro} + ${wm} + ${driver} affect the solution?
3. **News Check** - Are there any recent changes/issues that affect this?
4. **Solution** - Provide step-by-step with verification commands
5. **Warnings** - Issue relevant warnings based on their expertise level (${expertise})

### 4. RESPONSE FORMAT & LANGUAGE
- **LANGUAGE**: You MUST respond in the SAME LANGUAGE as the user's last message. If they speak Indonesian, you speak Indonesian. If English, English.
- **THINKING BLOCK**: You must wrap your analysis, context check, and internal reasoning inside [THINKING] and [/THINKING] tags. This part will be hidden by default.

Use this EXACT structure:

[THINKING]
1. Analysis: [Analyze the user's request]
2. System Check: [Check distro/version compatibility]
3. News Check: [Check for relevant breaking news]
4. Safety: [Evaluate command safety]
[/THINKING]

🔧 SOLUTION
[Direct answer/solution in the user's language]

✅ VERIFICATION
[Verification commands]

⚠️ WARNINGS
[Crucial warnings if any]

📰 RELATED NEWS
[Relevant news items if any]

### 5. EXPERTISE ADAPTATION
${expertise === 'beginner' ?
            '- Explain every command in detail\n- Include safety warnings\n- Suggest creating backups before any changes' :
            expertise === 'advanced' ?
                '- Be concise and technical\n- Skip basic explanations\n- Include optimization tips' :
                '- Balance between explanation and brevity\n- Explain non-obvious steps'}

### 6. SEARCH INTEGRATION
If the user asks about something that requires up-to-date information that isn't in the news feed:
- Acknowledge if you need to search for current information
- Reference the search results if provided
- Always cite sources when possible

REMEMBER: The user's profile is ALREADY loaded. Do NOT ask them to specify their distro - you KNOW it's ${distro}.`;
}

// ============================================================================
// COMPLEXITY CLASSIFIER
// ============================================================================

function classifyComplexity(messages: any[]): 'simple' | 'moderate' | 'complex' {
    const lastMsg = messages[messages.length - 1]?.content || '';
    const complexPatterns = /(compile|build from source|kernel|driver conflict|boot failure|network bridge|lvm|raid|systemd service|troubleshoot|debug|performance tuning)/i;
    const simplePatterns = /(how to|what is|check version|list|show|display|where is)/i;

    if (complexPatterns.test(lastMsg)) return 'complex';
    if (simplePatterns.test(lastMsg)) return 'simple';
    return 'moderate';
}

// ============================================================================
// MAIN SERVER
// ============================================================================

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const apiKey = Deno.env.get('GEMINI_API_KEY');

        if (!apiKey) throw new Error('GEMINI_API_KEY missing');

        const authHeader = req.headers.get('Authorization');
        let userTier: 'free' | 'pro' = 'free';
        let userId: string | null = null;
        let userProfile: any = null;

        // ================================================================
        // AUTH & PROFILE AUTO-LOAD
        // ================================================================
        if (authHeader?.startsWith('Bearer ') && supabaseUrl && supabaseServiceKey) {
            const token = authHeader.replace('Bearer ', '');

            if (token.length > 100) {
                const supabase = createClient(supabaseUrl, supabaseServiceKey);
                const { data: { user }, error } = await supabase.auth.getUser(token);

                if (!error && user) {
                    userId = user.id;

                    // Auto-load FULL user profile from database
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        userProfile = {
                            distro_type: profile.linux_distro || profile.distro_type,
                            distro_version: profile.distro_version,
                            de_wm: profile.wm_or_de || profile.de_wm,
                            gpu_driver: profile.gpu_driver || profile.gpu,
                            default_shell: profile.default_shell || 'bash',
                            expertise_level: profile.expertise_level || 'intermediate',
                            additional_setup_notes: profile.additional_setup_notes,
                            key_packages: profile.key_packages,
                        };
                        userTier = profile.tier || 'free';
                    }
                }
            }
        }

        // ================================================================
        // RATE LIMITING
        // ================================================================
        const identifier = userId || (req.headers.get('x-forwarded-for') || 'unknown');
        const now = Date.now();
        const limit = LIMITS[userTier];

        let limitData = rateLimitMap.get(identifier) || {
            count: 0,
            resetTime: now + limit.window,
            tier: userTier
        };

        if (now > limitData.resetTime) {
            limitData = { count: 0, resetTime: now + limit.window, tier: userTier };
        }

        if (limitData.count >= limit.requests) {
            return new Response(JSON.stringify({
                error: "Rate limit exceeded",
                retry_after: Math.ceil((limitData.resetTime - now) / 1000),
            }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        limitData.count++;
        rateLimitMap.set(identifier, limitData);

        // ================================================================
        // PARSE REQUEST
        // ================================================================
        const body = await req.json();
        const { messages, context: providedContext } = body;

        if (!messages?.length) throw new Error('Messages array required');

        // Merge provided context with auto-loaded profile (profile takes precedence)
        const finalContext = { ...providedContext, ...userProfile };

        // Safety check
        const lastMsg = messages[messages.length - 1];
        const safety = checkSafety(lastMsg.content || '', finalContext);
        if (!safety.safe) {
            return new Response(JSON.stringify({
                error: safety.reason,
                suggestion: "Please describe what you're trying to achieve."
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ================================================================
        // FETCH LIVE NEWS
        // ================================================================
        const distroNews = await getAllLinuxNews(finalContext?.distro_type);

        // ================================================================
        // WEB SEARCH (if needed)
        // ================================================================
        let searchResults: SearchResult[] = [];
        const searchCheck = needsWebSearch(lastMsg.content || '');
        if (searchCheck.needed && searchCheck.query) {
            searchResults = await searchWeb(searchCheck.query, apiKey);
        }

        // ================================================================
        // GITHUB SEARCH (if needed)
        // ================================================================
        let githubContext = '';
        const githubCheck = detectGitHubQuery(lastMsg.content || '');

        if (githubCheck.isGitHub) {
            if (githubCheck.repoName) {
                // Direct repo lookup
                const repoInfo = await getGitHubRepoInfo(githubCheck.repoName);
                if (repoInfo) {
                    githubContext = `\n\n## GITHUB REPOSITORY INFO (${githubCheck.repoName})\n${formatGitHubContext([repoInfo])}`;
                }
            } else if (githubCheck.searchQuery) {
                // Search for repos
                const repos = await searchGitHubRepos(githubCheck.searchQuery);
                if (repos.length > 0) {
                    // Get README for the top result
                    const topRepo = await getGitHubRepoInfo(repos[0].full_name);
                    if (topRepo) repos[0] = topRepo;
                    githubContext = `\n\n## GITHUB SEARCH RESULTS for "${githubCheck.searchQuery}"\n${formatGitHubContext(repos)}`;
                }
            }
        }

        // ================================================================
        // BUILD SYSTEM PROMPT WITH LIVE DATA
        // ================================================================
        let systemPrompt = await buildAdvancedSystemPrompt(
            finalContext,
            distroNews,
            searchResults
        );

        // Append GitHub context if available
        if (githubContext) {
            systemPrompt += githubContext;
        }

        // ================================================================
        // PREPARE GEMINI REQUEST
        // ================================================================
        const complexity = classifyComplexity(messages);

        const geminiMessages = messages
            .filter((m: any) => ['user', 'assistant', 'model'].includes(m.role))
            .map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            }));

        const requestBody: any = {
            contents: geminiMessages,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: complexity === 'complex' ? 0.7 : 0.5,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            },
        };

        // Add Google Search grounding for real-time queries
        if (searchCheck.needed) {
            requestBody.tools = [{ googleSearch: {} }];
        }

        // ================================================================
        // CALL GEMINI API (STREAMING)
        // ================================================================
        const geminiRes = await fetch(`${GEMINI_API_URL}?alt=sse&key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!geminiRes.ok) {
            const err = await geminiRes.text();
            throw new Error(`Gemini API: ${geminiRes.status} - ${err}`);
        }

        return new Response(geminiRes.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('Edge Function Error:', error);
        return new Response(JSON.stringify({
            error: (error as Error).message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});