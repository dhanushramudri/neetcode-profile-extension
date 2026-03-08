-- Run this in your Supabase SQL Editor

create table if not exists profiles (
  id                  uuid        default gen_random_uuid() primary key,
  username            text        unique not null,
  display_name        text,
  photo_url           text,
  country             text,
  joined              timestamptz,
  solved              int         default 0,
  total_problems      int         default 533,
  percentile          float,
  current_streak      int         default 0,
  max_streak          int         default 0,
  activity_by_date    jsonb       default '{}',
  leaderboard_buckets jsonb       default '[]',
  total_active_users  int,
  courses             jsonb       default '{}',
  problems            jsonb       default '{}',
  updated_at          timestamptz default now(),
  created_at          timestamptz default now()
);

-- Fast lookup by username
create index if not exists profiles_username_idx on profiles (username);

-- Row Level Security — profiles are public read, anyone can upsert
alter table profiles enable row level security;

create policy "Public profiles readable by all"
  on profiles for select using (true);

create policy "Anyone can insert a profile"
  on profiles for insert with check (true);

create policy "Anyone can update a profile"
  on profiles for update using (true);