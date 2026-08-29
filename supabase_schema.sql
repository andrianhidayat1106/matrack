-- =============================================================================
-- MATRACK CLEAN SUPABASE SETUP (Run this in Supabase -> SQL Editor -> Run)
-- =============================================================================

-- 1. Reset old tables with foreign key restrictions
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.columns CASCADE;
DROP TABLE IF EXISTS public.boards CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;

-- 2. Create Notes Table
CREATE TABLE public.notes (
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

-- 3. Create Boards Table
CREATE TABLE public.boards (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT DEFAULT 'My Schedule Board',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Create Columns Table
CREATE TABLE public.columns (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT REFERENCES public.boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Create Tasks Table
CREATE TABLE public.tasks (
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

-- 6. Disable Row Level Security (RLS) for direct client access
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;

-- 7. Grant full access permissions to public anon client
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
