import type { Metadata, Viewport } from 'next'
// import { JetBrains_Mono, Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/QueryProvider'

// const jetbrainsMono = JetBrains_Mono({
//   subsets: ['latin'],
//   variable: '--font-mono',
//   display: 'swap',
// })

// const inter = Inter({
//   subsets: ['latin'],
//   variable: '--font-sans',
//   display: 'swap',
// })

export const metadata: Metadata = {
  title: 'LinuxExpert AI - Terminal Assistant for Arch & Ubuntu',
  description: 'AI-powered terminal assistant specialized in Arch Linux and Ubuntu Server. Get expert help with commands, troubleshooting, and system administration.',
  keywords: ['Linux', 'Arch Linux', 'Ubuntu', 'Terminal', 'AI Assistant', 'System Administration'],
  authors: [{ name: 'LinuxExpert AI' }],
  openGraph: {
    title: 'LinuxExpert AI',
    description: 'Terminal Assistant for Arch Linux & Ubuntu Server',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020408',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`font-mono bg-slate-950 text-slate-100 min-h-screen`}
        suppressHydrationWarning
      >
        <QueryProvider>
          {children}
        </QueryProvider>
        {/* Subtle scanline overlay */}
        <div className="scanlines pointer-events-none fixed inset-0 z-[9999] opacity-[0.03]" />
      </body>
    </html>
  )
}
