-- LinuxExpert AI Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- USER SYSTEMS TABLE (system context)
-- ============================================
CREATE TABLE user_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    distro_type TEXT NOT NULL CHECK (distro_type IN ('arch', 'ubuntu-22.04', 'ubuntu-24.04')),
    kernel_version TEXT,
    de_wm TEXT,
    gpu TEXT CHECK (gpu IN ('nvidia', 'amd', 'intel', 'none')),
    packages JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_systems_updated_at
    BEFORE UPDATE ON user_systems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CHAT SESSIONS TABLE
-- ============================================
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    mode TEXT NOT NULL CHECK (mode IN ('arch', 'ubuntu')),
    system_context_id UUID REFERENCES user_systems(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for user's sessions
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    files JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at);

-- ============================================
-- ARCH NEWS TABLE
-- ============================================
CREATE TABLE arch_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Testing', 'Stable', 'Security', 'News', 'Update')),
    severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    published_at TIMESTAMPTZ DEFAULT NOW(),
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_arch_news_updated_at
    BEFORE UPDATE ON arch_news
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for news
CREATE INDEX idx_arch_news_published_at ON arch_news(published_at DESC);
CREATE INDEX idx_arch_news_category ON arch_news(category);
CREATE INDEX idx_arch_news_severity ON arch_news(severity);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE arch_news ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- User Systems: Users can only access their own system context
CREATE POLICY "Users can view own system context"
    ON user_systems FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own system context"
    ON user_systems FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own system context"
    ON user_systems FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own system context"
    ON user_systems FOR DELETE
    USING (auth.uid() = user_id);

-- Chat Sessions: Users can only access their own sessions
CREATE POLICY "Users can view own chat sessions"
    ON chat_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions"
    ON chat_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
    ON chat_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions"
    ON chat_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Messages: Users can only access messages from their own sessions
CREATE POLICY "Users can view messages from own sessions"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to own sessions"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own messages"
    ON messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own messages"
    ON messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- Arch News: Everyone can read, only admins can modify
CREATE POLICY "Arch news is viewable by everyone"
    ON arch_news FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert arch news"
    ON arch_news FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can update arch news"
    ON arch_news FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete arch news"
    ON arch_news FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for arch_news
ALTER PUBLICATION supabase_realtime ADD TABLE arch_news;

-- ============================================
-- SAMPLE DATA (Optional - for development)
-- ============================================

-- Insert sample arch news
INSERT INTO arch_news (title, content, category, severity, source_url) VALUES
('nvidia 545.29.06-1 requires manual intervention', 
 'The nvidia package has been updated to version 545.29.06-1. Users may need to rebuild their initramfs after the update. Run: sudo mkinitcpio -P', 
 'Update', 'high', 'https://archlinux.org/news/'),

('PHP 8.3 enters [testing]', 
 'PHP 8.3.0 has been added to the testing repository. Please test and report any issues before it moves to stable.', 
 'Testing', 'medium', 'https://archlinux.org/news/'),

('Critical OpenSSL vulnerability patched', 
 'A critical vulnerability in OpenSSL has been patched. Update immediately with: sudo pacman -Syu', 
 'Security', 'critical', 'https://security.archlinux.org/'),

('KDE Plasma 6.0 now in [stable]', 
 'KDE Plasma 6.0 has been moved to the stable repository. Users upgrading from Plasma 5 should review the migration guide.', 
 'Stable', 'medium', 'https://archlinux.org/news/'),

('Linux kernel 6.8 released', 
 'Linux kernel 6.8 is now available in the stable repository. New features include improved scheduler and updated drivers.', 
 'News', 'low', 'https://archlinux.org/news/');

-- ============================================
-- STORAGE BUCKETS (for file uploads)
-- ============================================

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can only access their own files
CREATE POLICY "Users can upload own chat attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-attachments' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view own chat attachments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'chat-attachments' AND
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete own chat attachments"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'chat-attachments' AND
        auth.uid() IS NOT NULL
    );
