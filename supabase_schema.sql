-- =============================================================================
-- Matrack Supabase Cloud Tables (Direct Client Architecture)
-- Run this in Supabase -> SQL Editor -> + New Query -> Run
-- =============================================================================

-- 1. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT DEFAULT 'Untitled Note',
    content TEXT DEFAULT '',
    folder TEXT DEFAULT 'Notes',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_trash BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Boards Table
CREATE TABLE IF NOT EXISTS public.boards (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT DEFAULT 'My Schedule Board',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Columns Table
CREATE TABLE IF NOT EXISTS public.columns (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT REFERENCES public.boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id BIGSERIAL PRIMARY KEY,
    column_id BIGINT REFERENCES public.columns(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    due_date TIMESTAMP WITH TIME ZONE,
    priority TEXT DEFAULT 'medium',
    position INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- If tables already existed with BIGINT user_id, convert them to TEXT:
ALTER TABLE IF EXISTS public.notes ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE IF EXISTS public.boards ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE IF EXISTS public.tasks ALTER COLUMN user_id TYPE TEXT;

-- Disable Row Level Security (RLS) so client can read/write directly
ALTER TABLE IF EXISTS public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks DISABLE ROW LEVEL SECURITY;

-- Grant permissions to public anon role
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
