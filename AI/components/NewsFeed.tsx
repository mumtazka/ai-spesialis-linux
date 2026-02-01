'use client'

import { useState, useEffect, useRef } from 'react'
import { Newspaper, ExternalLink, AlertCircle, ChevronRight, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { ArchNews } from '@/types'
import { formatRelativeTime } from '@/lib/utils'

interface NewsFeedProps {
  news?: ArchNews[]
  isLoading?: boolean
  onNewsClick?: (news: ArchNews) => void
}

// Mock data for initial render
const MOCK_NEWS: ArchNews[] = [
  {
    id: '1',
    title: 'nvidia 545.29.06-1 requires manual intervention',
    content: 'The nvidia package has been updated to version 545.29.06-1. Users may need to rebuild their initramfs after the update.',
    category: 'Update',
    severity: 'high',
    published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://archlinux.org/news/',
  },
  {
    id: '2',
    title: 'PHP 8.3 enters [testing]',
    content: 'PHP 8.3.0 has been added to the testing repository. Please test and report any issues.',
    category: 'Testing',
    severity: 'medium',
    published_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://archlinux.org/news/',
  },
  {
    id: '3',
    title: 'Critical OpenSSL vulnerability patched',
    content: 'A critical vulnerability in OpenSSL has been patched. Update immediately.',
    category: 'Security',
    severity: 'critical',
    published_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://security.archlinux.org/',
  },
  {
    id: '4',
    title: 'KDE Plasma 6.0 now in [stable]',
    content: 'KDE Plasma 6.0 has been moved to the stable repository. Users upgrading from Plasma 5 should review the migration guide.',
    category: 'Stable',
    severity: 'medium',
    published_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://archlinux.org/news/',
  },
  {
    id: '5',
    title: 'Linux kernel 6.8 released',
    content: 'Linux kernel 6.8 is now available in the stable repository.',
    category: 'News',
    severity: 'low',
    published_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://archlinux.org/news/',
  },
]

function getCategoryColor(category: ArchNews['category']): string {
  switch (category) {
    case 'Testing':
      return 'warning'
    case 'Stable':
      return 'arch'
    case 'Security':
      return 'danger'
    case 'Update':
      return 'info'
    default:
      return 'neutral'
  }
}

function getSeverityColor(severity: ArchNews['severity']): string {
  switch (severity) {
    case 'critical':
      return 'text-terminal-red'
    case 'high':
      return 'text-terminal-orange'
    case 'medium':
      return 'text-terminal-yellow'
    default:
      return 'text-slate-400'
  }
}

export function NewsFeed({
  news: externalNews,
  isLoading = false,
  onNewsClick,
}: NewsFeedProps) {
  const [news, setNews] = useState<ArchNews[]>(externalNews || [])
  const [isFetching, setIsFetching] = useState(false)
  const [selectedNews, setSelectedNews] = useState<ArchNews | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch real news (currently just re-fetching props, logic can be updated for generic source)
  const fetchNews = async () => {
    // For now, we rely on props or mock, as /api/news/arch might be specific
    // In a real app, this would fetch from a generic news source or a personal feed
    onNewsClick && console.log("Refresh clicked")
  }

  // Initial fetch and polling
  useEffect(() => {
    // interval disabled for now as we don't have a generic endpoint yet
  }, [])

  // Auto-scroll to top when new news arrives
  useEffect(() => {
    if (scrollRef.current && news.length > 0) {
      scrollRef.current.scrollTop = 0
    }
  }, [news.length])

  // Update news when external data changes (if provided)
  useEffect(() => {
    if (externalNews) {
      setNews(externalNews)
    }
  }, [externalNews])

  const handleNewsClick = (item: ArchNews) => {
    setSelectedNews(item)
    setIsSheetOpen(true)
    onNewsClick?.(item)
  }

  return (
    <>
      <div className="hidden lg:flex flex-col h-full w-80 bg-slate-950 border-r border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-terminal-green" />
            <h2 className="text-sm font-semibold text-slate-100">Linux News</h2>
          </div>
          <div className="flex items-center gap-1">
            {/* Refresh button can be re-enabled when backend is ready */}
          </div>
        </div>

        {/* News List */}
        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="p-2 space-y-1">
            {isLoading || isFetching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-terminal-green" />
              </div>
            ) : news.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-slate-500">No news available</p>
              </div>
            ) : (
              news.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNewsClick(item)}
                  className={cn(
                    'w-full text-left p-3 rounded-sm transition-all duration-200',
                    'hover:bg-slate-900 border border-transparent',
                    'hover:border-slate-700 group'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={getCategoryColor(item.category) as any}
                          className="text-[9px] px-1 py-0"
                        >
                          {item.category}
                        </Badge>
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full flex-shrink-0',
                            getSeverityColor(item.severity).replace('text-', 'bg-')
                          )}
                        />
                      </div>
                      <h3 className="text-xs font-medium text-slate-200 line-clamp-2 group-hover:text-slate-100">
                        {item.title}
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        {formatRelativeTime(item.published_at)}
                      </span>
                    </div>
                    <ChevronRight className="h-3 w-3 text-slate-600 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          <a
            href="https://archlinux.org/news/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-terminal-green transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View all on archlinux.org
          </a>
        </div>
      </div>

      {/* News Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-slate-950 border-slate-700 w-full sm:max-w-lg">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant={selectedNews ? (getCategoryColor(selectedNews.category) as any) : 'neutral'}
              >
                {selectedNews?.category}
              </Badge>
              {selectedNews?.severity === 'critical' && (
                <div className="flex items-center gap-1 text-terminal-red">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-xs">Critical</span>
                </div>
              )}
            </div>
            <SheetTitle className="text-slate-100 text-left">
              {selectedNews?.title}
            </SheetTitle>
            <SheetDescription className="text-slate-400 text-left">
              Published {selectedNews && formatRelativeTime(selectedNews.published_at)}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedNews?.content}
            </p>
            {selectedNews?.source_url && (
              <a
                href={selectedNews.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-xs text-terminal-green hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Read more
              </a>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
