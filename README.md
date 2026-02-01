# LinuxExpert AI

A terminal-themed AI assistant web application specialized in Arch Linux and Ubuntu Server administration. Built with Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Supabase, and Zustand.

![LinuxExpert AI](https://img.shields.io/badge/LinuxExpert-AI-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)

## Features

- **Dual Mode Expertise**: Instantly switch between Arch Linux (green theme) and Ubuntu Server (orange theme) expertise
- **Command Safety Analysis**: Real-time regex detection of dangerous commands with visual warnings
- **Terminal Aesthetic**: True black background, monospace fonts, glowing accents, scanline effects
- **Multimodal Support**: Drag-and-drop file uploads with preview
- **Real-time News Feed**: Arch Linux news updates via Supabase Realtime
- **System Context**: Persist system configuration to database for personalized responses
- **Streaming Responses**: Real-time AI response streaming
- **Syntax Highlighting**: All code blocks with copy functionality
- **Responsive Design**: Mobile layout with Sheets for sidebars, desktop 3-column layout
- **Keyboard Shortcuts**: Power user navigation (Ctrl+L clear, Ctrl+/ focus)

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: Zustand with persistence
- **Database**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth
- **Data Fetching**: TanStack Query (React Query)
- **Icons**: Lucide React
- **Markdown**: react-markdown + react-syntax-highlighter

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/linux-expert-ai.git
cd linux-expert-ai
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor
3. Run the schema from `supabase/schema.sql`

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Production Build

```bash
npm run build
npm start
```

## Project Structure

```
linux-expert-ai/
├── app/                      # Next.js 14 App Router
│   ├── api/                  # API Routes
│   │   ├── chat/            # Chat streaming endpoint
│   │   └── news/            # News CRUD endpoints
│   ├── globals.css          # Global styles + terminal theme
│   ├── layout.tsx           # Root layout with fonts
│   └── page.tsx             # Main chat page
├── components/               # React components
│   ├── ui/                  # shadcn/ui components
│   ├── ChatMessage.tsx      # Message bubble with markdown
│   ├── CommandSafetyBadge.tsx # Safety indicator
│   ├── FileDropZone.tsx     # File upload component
│   ├── ModeToggle.tsx       # Arch/Ubuntu switcher
│   ├── NewsFeed.tsx         # Realtime news sidebar
│   ├── SystemContext.tsx    # System config form
│   ├── TerminalChat.tsx     # Main chat layout
│   ├── TerminalHeader.tsx   # Header with user menu
│   └── TerminalInput.tsx    # Message input area
├── lib/                     # Utilities
│   ├── commands.ts          # Command safety analysis
│   ├── prompts.ts           # AI system prompts
│   ├── supabase/            # Supabase clients
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client
│   └── utils.ts             # Helper functions
├── store/                   # Zustand stores
│   ├── chatStore.ts         # Chat state management
│   └── modeStore.ts         # Mode (arch/ubuntu) state
├── supabase/                # Database
│   └── schema.sql           # Complete database schema
├── types/                   # TypeScript types
│   └── index.ts             # All type definitions
├── tailwind.config.ts       # Tailwind with terminal colors
└── package.json             # Dependencies
```

## API Integration

### Gemini API Setup

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add it to `.env.local`:
   ```env
   GEMINI_API_KEY=your-api-key-here
   ```
3. Update `app/api/chat/route.ts` to use Gemini instead of mock responses:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// In your streaming function:
const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
const result = await model.generateContentStream({
  contents: messages.map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }))
})

for await (const chunk of result.stream) {
  const text = chunk.text()
  controller.enqueue(
    new TextEncoder().encode(`data: ${JSON.stringify({ content: text })}\n\n`)
  )
}
```

## Command Safety

The application includes comprehensive command safety analysis:

### Dangerous Patterns Detected

- `rm -rf /` - System destruction
- `mkfs.* /dev/*` - Disk formatting
- `dd if=* of=/dev/*` - Direct disk writes
- `pacman -Scc` - Cache clearing
- `systemctl restart display-manager` - Session termination
- `chmod 777 /` - Permission destruction
- Fork bombs and more

### Safety Levels

- **Safe** (Green): No dangerous patterns detected
- **Caution** (Yellow): Potentially disruptive but not destructive
- **Danger** (Red): Destructive or system-breaking commands

## Customization

### Theme Colors

Edit `tailwind.config.ts`:

```typescript
colors: {
  terminal: {
    green: '#00ff41',   // Arch accent
    orange: '#e95420',  // Ubuntu accent
    red: '#ff0040',     // Danger
    cyan: '#00ffff',    // Info
    yellow: '#ffcc00',  // Warning
  }
}
```

### System Prompts

Edit `lib/prompts.ts` to customize AI behavior:

- `ARCH_SYSTEM_PROMPT`: Arch Linux expert personality
- `UBUNTU_SYSTEM_PROMPT`: Ubuntu Server architect personality

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Ctrl+L` | Clear chat history |
| `Ctrl+/` | Focus input field |

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Add environment variables in Vercel dashboard.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Arch Linux](https://archlinux.org/) and [Ubuntu](https://ubuntu.com/) communities
