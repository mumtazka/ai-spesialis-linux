/**
 * Linux News API Client
 * Fetches aggregated Linux news from Supabase Edge Function
 */

export interface NewsItem {
    id: string;
    title: string;
    date: string;
    source: string;
    url: string;
    summary: string;
    severity: 'info' | 'warning' | 'critical';
    distro: string;
    tags: string[];
}

export interface NewsResponse {
    success: boolean;
    count: number;
    last_updated: string;
    sources: string[];
    items: NewsItem[];
    error?: string;
}

export interface NewsOptions {
    distro?: string;
    limit?: number;
    severity?: 'info' | 'warning' | 'critical';
}

const NEWS_CACHE_KEY = 'linux_news_cache';
const NEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes client-side cache

interface CachedNews {
    data: NewsResponse;
    fetchedAt: number;
}

/**
 * Fetch Linux news from the Edge Function
 */
export async function fetchLinuxNews(options: NewsOptions = {}): Promise<NewsResponse> {
    // Check client-side cache first
    const cacheKey = `${NEWS_CACHE_KEY}_${JSON.stringify(options)}`;

    if (typeof window !== 'undefined') {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsedCache: CachedNews = JSON.parse(cached);
                if (Date.now() - parsedCache.fetchedAt < NEWS_CACHE_TTL) {
                    return parsedCache.data;
                }
            }
        } catch (e) {
            // localStorage not available or parse error
        }
    }

    const params = new URLSearchParams();
    if (options.distro) params.set('distro', options.distro);
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.severity) params.set('severity', options.severity);

    try {
        // Use local API route instead of Supabase Edge Function
        const response = await fetch(
            `/api/news?${params.toString()}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!response.ok) {
            throw new Error(`News API error: ${response.status}`);
        }

        const data: NewsResponse = await response.json();

        // Cache the response
        if (typeof window !== 'undefined' && data.success) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    data,
                    fetchedAt: Date.now()
                }));
            } catch (e) {
                // localStorage full or not available
            }
        }

        return data;
    } catch (error) {
        console.error('Failed to fetch news:', error);
        return {
            success: false,
            count: 0,
            last_updated: new Date().toISOString(),
            sources: [],
            items: [],
            error: error instanceof Error ? error.message : 'Failed to fetch news'
        };
    }
}

/**
 * Get news for a specific user's distro
 */
export async function fetchUserDistroNews(distro: string, limit = 10): Promise<NewsItem[]> {
    const response = await fetchLinuxNews({ distro, limit });
    return response.items;
}

/**
 * Get breaking/critical news across all distros
 */
export async function fetchBreakingNews(limit = 5): Promise<NewsItem[]> {
    const response = await fetchLinuxNews({ severity: 'critical', limit });
    return response.items;
}

/**
 * Get all recent news
 */
export async function fetchRecentNews(limit = 20): Promise<NewsItem[]> {
    const response = await fetchLinuxNews({ limit });
    return response.items;
}

/**
 * Format relative time for news display
 */
export function formatNewsTime(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
}

/**
 * Get severity color class
 */
export function getSeverityColor(severity: NewsItem['severity']): string {
    switch (severity) {
        case 'critical':
            return 'text-red-500 bg-red-500/10 border-red-500/30';
        case 'warning':
            return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
        default:
            return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
}

/**
 * Get severity icon
 */
export function getSeverityIcon(severity: NewsItem['severity']): string {
    switch (severity) {
        case 'critical':
            return '🚨';
        case 'warning':
            return '⚠️';
        default:
            return '📰';
    }
}

/**
 * Get distro color
 */
export function getDistroColor(distro: string): string {
    const colors: Record<string, string> = {
        arch: '#1793d1',
        ubuntu: '#e95420',
        fedora: '#3c6eb4',
        debian: '#a80030',
        opensuse: '#73ba25',
        manjaro: '#35bf5c',
        kernel: '#ffcc00',
        nixos: '#5277c3',
        endeavouros: '#7f3fbf',
        linuxmint: '#87cf3e',
    };
    return colors[distro.toLowerCase()] || '#6b7280';
}
