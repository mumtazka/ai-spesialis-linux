-- Refactor user_systems to link to app_users instead of auth.users

-- 1. DROP EXISTING POLICIES FIRST (Dependencies)
-- Drop typical policy names that might exist
DROP POLICY IF EXISTS "Users can view their own system" ON public.user_systems;
DROP POLICY IF EXISTS "Users can update their own system" ON public.user_systems;
DROP POLICY IF EXISTS "Users can insert their own system" ON public.user_systems;
DROP POLICY IF EXISTS "Users can view own system context" ON public.user_systems; -- Policy from error message
DROP POLICY IF EXISTS "Users can update own system context" ON public.user_systems;
DROP POLICY IF EXISTS "Users can insert own system context" ON public.user_systems;
DROP POLICY IF EXISTS "Users can delete own system context" ON public.user_systems; -- Policy from error message
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_systems;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_systems;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.user_systems;


-- 2. Create app_users table for simple username-based auth
CREATE TABLE IF NOT EXISTS public.app_users (
    username TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on app_users (public read/write for this demo app)
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on app_users" ON public.app_users
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on app_users" ON public.app_users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on app_users" ON public.app_users
    FOR UPDATE USING (true);


-- 3. Modify user_systems
-- drop constraint if exists
ALTER TABLE public.user_systems DROP CONSTRAINT IF EXISTS user_systems_user_id_fkey;

-- We need to change user_id from uuid to text to match app_users.username
-- CAUTION: This drops existing data linkage. Since we are migrating auth systems, this is expected.
ALTER TABLE public.user_systems ALTER COLUMN user_id TYPE TEXT;

-- Add FK
ALTER TABLE public.user_systems 
    ADD CONSTRAINT user_systems_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.app_users(username) 
    ON DELETE CASCADE;

-- Update columns for user_systems
ALTER TABLE public.user_systems DROP CONSTRAINT IF EXISTS user_systems_distro_type_check;
ALTER TABLE public.user_systems DROP CONSTRAINT IF EXISTS user_systems_gpu_check;

-- Change columns to simple text to allow any input
ALTER TABLE public.user_systems ALTER COLUMN distro_type TYPE TEXT;
ALTER TABLE public.user_systems ALTER COLUMN gpu TYPE TEXT;

-- Add new columns
ALTER TABLE public.user_systems ADD COLUMN IF NOT EXISTS distro_version TEXT;
ALTER TABLE public.user_systems ADD COLUMN IF NOT EXISTS additional_setup_notes TEXT;

-- 4. Re-enable RLS for user_systems
CREATE POLICY "Allow public access to user_systems" ON public.user_systems
    FOR ALL USING (true);

-- Drop mode column from chat_sessions as it is no longer used (we infer from profile)
ALTER TABLE public.chat_sessions DROP COLUMN IF EXISTS mode;
