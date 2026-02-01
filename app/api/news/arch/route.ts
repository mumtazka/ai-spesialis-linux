
import { NextResponse } from 'next/server'
// Remove top-level import
// import Parser from 'rss-parser'
import { ArchNews } from '@/types'

export const revalidate = 300 // Revalidate every 5 minutes

const FEED_URL = 'https://archlinux.org/feeds/news/'

function determineCategory(title: string, content: string): ArchNews['category'] {
    const lowerTitle = title.toLowerCase()
    const lowerContent = content.toLowerCase()

    if (lowerTitle.includes('[testing]')) return 'Testing'
    if (lowerTitle.includes('vulnerability') || lowerTitle.includes('security')) return 'Security'
    if (lowerTitle.includes('update') || lowerTitle.includes('intervention')) return 'Update'
    if (lowerTitle.includes('[stable]')) return 'Stable'

    return 'News'
}

function determineSeverity(title: string, content: string): ArchNews['severity'] {
    const lowerTitle = title.toLowerCase()
    const lowerContent = content.toLowerCase()

    if (lowerTitle.includes('critical') || lowerContent.includes('critical')) return 'critical'
    if (lowerTitle.includes('intervention') || lowerTitle.includes('manual')) return 'high'
    if (lowerTitle.includes('vulnerability')) return 'high'
    if (lowerTitle.includes('[testing]')) return 'medium'

    return 'low'
}

export async function GET() {
    try {
        // Dynamic import to avoid top-level CJS/ESM issues
        const Parser = (await import('rss-parser')).default
        const parser = new Parser()

        const feed = await parser.parseURL(FEED_URL)

        // Filter and map items
        const news: ArchNews[] = feed.items.map((item) => {
            // Generate stable ID from link or guid
            const id = item.guid || item.link || Math.random().toString(36).substring(7)

            const title = item.title || 'Untitled Update'
            const content = item.contentSnippet || item.content || ''
            const category = determineCategory(title, content)
            const severity = determineSeverity(title, content)

            return {
                id,
                title,
                content,
                category,
                severity,
                published_at: item.isoDate || new Date().toISOString(),
                source_url: item.link || FEED_URL
            }
        }).slice(0, 10) // Keep latest 10 items

        return NextResponse.json(news)
    } catch (error) {
        console.error('Failed to fetch Arch news:', error)
        return NextResponse.json(
            { error: 'Failed to fetch news feed', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
