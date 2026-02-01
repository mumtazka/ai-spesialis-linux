import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// ============================================================================
// LINUX NEWS AGGREGATOR - Multi-source RSS feeds
// ============================================================================

interface NewsItem {
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

// RSS Feed sources
const NEWS_SOURCES: Record<string, { name: string; url: string; color: string }> = {
  arch: {
    name: 'Arch Linux',
    url: 'https://archlinux.org/feeds/news/',
    color: '#1793d1'
  },
  ubuntu: {
    name: 'Ubuntu',
    url: 'https://ubuntu.com/blog/feed',
    color: '#e95420'
  },
  fedora: {
    name: 'Fedora',
    url: 'https://fedoramagazine.org/feed/',
    color: '#3c6eb4'
  },
  debian: {
    name: 'Debian',
    url: 'https://www.debian.org/News/news',
    color: '#a80030'
  },
  opensuse: {
    name: 'openSUSE',
    url: 'https://news.opensuse.org/feed/',
    color: '#73ba25'
  },
  manjaro: {
    name: 'Manjaro',
    url: 'https://forum.manjaro.org/c/announcements/8.rss',
    color: '#35bf5c'
  },
  kernel: {
    name: 'Linux Kernel',
    url: 'https://www.kernel.org/feeds/kdist.xml',
    color: '#ffcc00'
  },
  nixos: {
    name: 'NixOS',
    url: 'https://nixos.org/blog/announcements-rss.xml',
    color: '#5277c3'
  },
  endeavouros: {
    name: 'EndeavourOS',
    url: 'https://endeavouros.com/feed/',
    color: '#7f3fbf'
  },
  linuxmint: {
    name: 'Linux Mint',
    url: 'https://blog.linuxmint.com/?feed=rss2',
    color: '#87cf3e'
  }
};

async function fetchRSSFeed(sourceKey: string, sourceInfo: { name: string; url: string; color: string }): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(sourceInfo.url, {
      headers: {
        'User-Agent': 'LinuxExpertAI/1.0 (+https://linuxexpert.ai)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Failed to fetch ${sourceKey}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    return parseRSS(text, sourceKey, sourceInfo);
  } catch (error) {
    console.error(`Error fetching ${sourceKey}:`, error);
    return [];
  }
}

function parseRSS(xmlText: string, sourceKey: string, sourceInfo: { name: string; url: string; color: string }): NewsItem[] {
  const items: NewsItem[] = [];

  // Match both <item> (RSS 2.0) and <entry> (Atom)
  const itemRegex = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;

  let match;
  let count = 0;

  while ((match = itemRegex.exec(xmlText)) !== null && count < 10) {
    const itemContent = match[1] || match[2];

    // Extract fields with multiple format support
    const title = extractField(itemContent, ['title']);
    const link = extractLink(itemContent);
    const date = extractField(itemContent, ['pubDate', 'published', 'updated', 'dc:date']);
    const description = extractField(itemContent, ['description', 'summary', 'content']);

    if (!title) continue;

    // Detect severity based on content
    const severity = detectSeverity(title, description);

    // Extract tags from content
    const tags = extractTags(title, description, sourceKey);

    // Clean text and decode entities
    const cleanTitle = cleanText(title);
    const cleanDescription = cleanText(description).substring(0, 500); // Limit length but keep enough context

    items.push({
      id: `${sourceKey}-${count}-${Date.now()}`,
      title: cleanTitle,
      date: formatDate(date),
      source: sourceInfo.name,
      url: link,
      summary: cleanDescription,
      severity,
      distro: sourceKey,
      tags
    });

    count++;
  }

  return items;
}

function extractField(content: string, fieldNames: string[]): string {
  for (const field of fieldNames) {
    // Try CDATA format first
    const cdataRegex = new RegExp(`<${field}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${field}>`, 'i');
    let match = cdataRegex.exec(content);
    if (match) return match[1];

    // Then try regular format
    const regularRegex = new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, 'i');
    match = regularRegex.exec(content);
    if (match) return match[1];
  }
  return '';
}

function extractLink(content: string): string {
  // RSS 2.0 format
  const linkMatch = /<link>([^<]+)<\/link>/.exec(content);
  if (linkMatch) return linkMatch[1].trim();

  // Atom format
  const atomMatch = /<link[^>]*href="([^"]+)"/.exec(content);
  if (atomMatch) return atomMatch[1].trim();

  return '';
}

function detectSeverity(title: string, description: string): 'info' | 'warning' | 'critical' {
  const text = `${title} ${description}`.toLowerCase();

  // Critical indicators
  const criticalPatterns = [
    'security', 'vulnerability', 'cve-', 'exploit', 'urgent',
    'critical', 'emergency', 'data loss', 'breach', 'remote code execution'
  ];
  for (const pattern of criticalPatterns) {
    if (text.includes(pattern)) return 'critical';
  }

  // Warning indicators
  const warningPatterns = [
    'breaking change', 'manual intervention', 'migration required',
    'deprecated', 'end of life', 'eol', 'important', 'attention',
    'before updating', 'known issue', 'regression', 'requires manual'
  ];
  for (const pattern of warningPatterns) {
    if (text.includes(pattern)) return 'warning';
  }

  return 'info';
}

function extractTags(title: string, description: string, distro: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const tags: string[] = [distro];

  // Package-related
  if (text.includes('kernel') || text.includes('linux')) tags.push('kernel');
  if (text.includes('systemd')) tags.push('systemd');
  if (text.includes('gnome')) tags.push('gnome');
  if (text.includes('kde') || text.includes('plasma')) tags.push('kde');
  if (text.includes('nvidia')) tags.push('nvidia');
  if (text.includes('amd') || text.includes('radeon')) tags.push('amd');
  if (text.includes('wayland')) tags.push('wayland');
  if (text.includes('xorg') || text.includes('x11')) tags.push('xorg');
  if (text.includes('grub')) tags.push('grub');
  if (text.includes('boot')) tags.push('boot');
  if (text.includes('network')) tags.push('network');
  if (text.includes('security') || text.includes('cve')) tags.push('security');
  if (text.includes('zfs') || text.includes('btrfs')) tags.push('filesystem');

  return [...new Set(tags)];
}

function cleanText(text: string): string {
  // 1. Unescape common HTML entities
  let decoded = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, '');

  // 2. Strip HTML tags to leave only plain text
  // The user complained about <p> tags showing up, so we want to strip the tags themselves
  // but keep the content.
  decoded = decoded.replace(/<[^>]*>/g, ' ');

  // 3. Clean up whitespace
  return decoded.replace(/\s+/g, ' ').trim();
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function fetchAllNews(filter?: string): Promise<NewsItem[]> {
  // In a real edge function we might use KV or similar for caching, 
  // but here we just fetch fresh for simplicity or could implement simple memory cache if needed.
  // Given the 5 min client-side cache, fresh fetch here is fine.

  const sourcesToFetch = filter && NEWS_SOURCES[filter.toLowerCase()]
    ? { [filter.toLowerCase()]: NEWS_SOURCES[filter.toLowerCase()] }
    : NEWS_SOURCES;

  const fetchPromises = Object.entries(sourcesToFetch).map(
    ([key, source]) => fetchRSSFeed(key, source)
  );

  const results = await Promise.allSettled(fetchPromises);
  const allNews: NewsItem[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
    }
  }

  // Sort by date (newest first)
  allNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return allNews;
}

// GET /api/news - Fetch aggregated Linux news
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const distro = searchParams.get('distro')
    const limit = parseInt(searchParams.get('limit') || '20')
    const severity = searchParams.get('severity')

    let news = await fetchAllNews(distro || undefined)

    // Filter by severity if specified
    if (severity) {
      news = news.filter(item => item.severity === severity)
    }

    // Apply limit
    news = news.slice(0, Math.min(limit, 50))

    return NextResponse.json({
      success: true,
      count: news.length,
      last_updated: new Date().toISOString(),
      sources: Object.keys(NEWS_SOURCES),
      items: news
    })

  } catch (error) {
    console.error('News API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
