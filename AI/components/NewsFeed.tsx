'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Newspaper, ExternalLink, AlertCircle, ChevronRight, RefreshCw, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  fetchLinuxNews,
  formatNewsTime,
  getSeverityColor,
  getSeverityIcon,
  getDistroColor,
  type NewsItem
} from '@/lib/news'

interface NewsFeedProps {
  userDistro?: string
  onNewsClick?: (news: NewsItem) => void
}

const DISTRO_OPTIONS = [
  { key: 'all', label: 'All Distros' },
  { key: 'arch', label: 'Arch Linux' },
  { key: 'ubuntu', label: 'Ubuntu' },
  { key: 'fedora', label: 'Fedora' },
  { key: 'debian', label: 'Debian' },
  { key: 'manjaro', label: 'Manjaro' },
  { key: 'opensuse', label: 'openSUSE' },
  { key: 'kernel', label: 'Linux Kernel' },
  { key: 'nixos', label: 'NixOS' },
]

export function NewsFeed({ userDistro, onNewsClick }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [filterDistro, setFilterDistro] = useState<string | undefined>(userDistro?.toLowerCase())
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch news
  const loadNews = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const response = await fetchLinuxNews({
        distro: filterDistro === 'all' ? undefined : filterDistro,
        limit: 30
      })

      if (response.success) {
        setNews(response.items)
        setLastUpdated(response.last_updated)
      }
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [filterDistro])

  // Initial fetch
  useEffect(() => {
    loadNews()
  }, [loadNews])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadNews(true)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [loadNews])

  // Update filter when user distro changes
  useEffect(() => {
    if (userDistro) {
      setFilterDistro(userDistro.toLowerCase())
    }
  }, [userDistro])

  // Scroll to top when new news arrives
  useEffect(() => {
    if (scrollRef.current && news.length > 0) {
      scrollRef.current.scrollTop = 0
    }
  }, [news.length])

  const handleNewsClick = (item: NewsItem) => {
    setSelectedNews(item)
    setIsSheetOpen(true)
    onNewsClick?.(item)
  }

  const handleRefresh = () => {
    loadNews(true)
  }

  const handleFilterChange = (distro: string) => {
    setFilterDistro(distro === 'all' ? undefined : distro)
  }

  // Group news by severity for visual priority
  const criticalNews = news.filter(n => n.severity === 'critical')
  const warningNews = news.filter(n => n.severity === 'warning')
  const infoNews = news.filter(n => n.severity === 'info')

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
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Filter className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-slate-900 border-slate-700">
                <DropdownMenuLabel className="text-xs text-slate-400">
                  Filter by Distro
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                {DISTRO_OPTIONS.map(option => (
                  <DropdownMenuItem
                    key={option.key}
                    onClick={() => handleFilterChange(option.key)}
                    className={cn(
                      "text-xs cursor-pointer",
                      filterDistro === option.key || (!filterDistro && option.key === 'all')
                        ? "bg-slate-800 text-terminal-green"
                        : "text-slate-300"
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn(
                "h-3 w-3 text-slate-400",
                isRefreshing && "animate-spin"
              )} />
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="px-4 py-1 border-b border-slate-800/50">
            <span className="text-[10px] text-slate-500">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* News List */}
        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-terminal-green" />
              </div>
            ) : news.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Newspaper className="h-8 w-8 text-slate-600" />
                <p className="text-xs text-slate-500">No news available</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  className="text-xs text-terminal-green"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {/* Critical News Section */}
                {criticalNews.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1 px-2 py-1 mb-1">
                      <span className="text-[10px] font-medium text-red-500 uppercase tracking-wider">
                        🚨 Breaking / Critical
                      </span>
                    </div>
                    {criticalNews.map((item) => (
                      <NewsCard key={item.id} item={item} onClick={handleNewsClick} />
                    ))}
                  </div>
                )}

                {/* Warning News Section */}
                {warningNews.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-1 px-2 py-1 mb-1">
                      <span className="text-[10px] font-medium text-yellow-500 uppercase tracking-wider">
                        ⚠️ Requires Attention
                      </span>
                    </div>
                    {warningNews.map((item) => (
                      <NewsCard key={item.id} item={item} onClick={handleNewsClick} />
                    ))}
                  </div>
                )}

                {/* Info News Section */}
                {infoNews.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1 px-2 py-1 mb-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        📰 Latest Updates
                      </span>
                    </div>
                    {infoNews.slice(0, 15).map((item) => (
                      <NewsCard key={item.id} item={item} onClick={handleNewsClick} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>
              {filterDistro ? `Showing: ${filterDistro}` : 'All distros'}
            </span>
            <span>{news.length} items</span>
          </div>
        </div>
      </div>

      {/* News Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-slate-950 border-slate-700 w-full sm:max-w-lg">
          <SheetHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className="text-[10px]"
                style={{
                  backgroundColor: `${getDistroColor(selectedNews?.distro || '')}20`,
                  color: getDistroColor(selectedNews?.distro || ''),
                  borderColor: `${getDistroColor(selectedNews?.distro || '')}40`
                }}
              >
                {selectedNews?.source}
              </Badge>
              {selectedNews?.severity === 'critical' && (
                <div className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-xs font-medium">Critical</span>
                </div>
              )}
              {selectedNews?.severity === 'warning' && (
                <div className="flex items-center gap-1 text-yellow-500">
                  <AlertCircle className="h-3 w-3" />
                  <span className="text-xs font-medium">Warning</span>
                </div>
              )}
            </div>
            <SheetTitle className="text-slate-100 text-left text-base">
              {selectedNews?.title}
            </SheetTitle>
            <SheetDescription className="text-slate-400 text-left text-xs">
              {selectedNews && new Date(selectedNews.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedNews?.summary}
            </p>

            {/* Tags */}
            {selectedNews?.tags && selectedNews.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedNews.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] text-slate-400 border-slate-600"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {selectedNews?.url && (
              <a
                href={selectedNews.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-terminal-green hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Read full article
              </a>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// Separate NewsCard component for cleaner code
function NewsCard({ item, onClick }: { item: NewsItem; onClick: (item: NewsItem) => void }) {
  return (
    <button
      onClick={() => onClick(item)}
      className={cn(
        'w-full text-left p-3 rounded-sm transition-all duration-200',
        'hover:bg-slate-900 border border-transparent',
        'hover:border-slate-700 group',
        item.severity === 'critical' && 'border-l-2 border-l-red-500/50',
        item.severity === 'warning' && 'border-l-2 border-l-yellow-500/50'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Badge
              className="text-[9px] px-1.5 py-0"
              style={{
                backgroundColor: `${getDistroColor(item.distro)}20`,
                color: getDistroColor(item.distro),
              }}
            >
              {item.source}
            </Badge>
            <span className="text-[9px] text-slate-500">
              {formatNewsTime(item.date)}
            </span>
          </div>
          <h3 className="text-xs font-medium text-slate-200 line-clamp-2 group-hover:text-slate-100">
            {item.title}
          </h3>
        </div>
        <ChevronRight className="h-3 w-3 text-slate-600 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}
