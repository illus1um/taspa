-- Add missing fields to support import functionality

-- Add url field to vk_groups
ALTER TABLE vk_groups ADD COLUMN IF NOT EXISTS url TEXT;

-- Add missing fields to vk_members
ALTER TABLE vk_members ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE vk_members ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE vk_members ADD COLUMN IF NOT EXISTS last_recently TIMESTAMPTZ;
ALTER TABLE vk_members ADD COLUMN IF NOT EXISTS data_timestamp TIMESTAMPTZ;

-- Add name field to instagram_accounts
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS name TEXT;

-- Add missing fields to instagram_users
ALTER TABLE instagram_users ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE instagram_users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE instagram_users ADD COLUMN IF NOT EXISTS data_timestamp TIMESTAMPTZ;

-- Add name field to tiktok_accounts
ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS name TEXT;

-- Add missing fields to tiktok_users
ALTER TABLE tiktok_users ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE tiktok_users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE tiktok_users ADD COLUMN IF NOT EXISTS data_timestamp TIMESTAMPTZ;
