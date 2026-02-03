CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  refresh_token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS directions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direction_sources (
  id BIGSERIAL PRIMARY KEY,
  direction_id BIGINT NOT NULL REFERENCES directions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('vk_group', 'instagram_account', 'tiktok_account')),
  source_identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (direction_id, source_type, source_identifier)
);

CREATE TABLE IF NOT EXISTS vk_groups (
  id BIGSERIAL PRIMARY KEY,
  direction_id BIGINT NOT NULL REFERENCES directions(id) ON DELETE CASCADE,
  vk_group_id TEXT NOT NULL,
  name TEXT,
  members_count INTEGER,
  scraped_at TIMESTAMPTZ,
  UNIQUE (direction_id, vk_group_id)
);

CREATE TABLE IF NOT EXISTS instagram_accounts (
  id BIGSERIAL PRIMARY KEY,
  direction_id BIGINT NOT NULL REFERENCES directions(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  url TEXT,
  bio TEXT,
  location TEXT,
  scraped_at TIMESTAMPTZ,
  UNIQUE (direction_id, username)
);

CREATE TABLE IF NOT EXISTS tiktok_accounts (
  id BIGSERIAL PRIMARY KEY,
  direction_id BIGINT NOT NULL REFERENCES directions(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  url TEXT,
  location TEXT,
  followers_count INTEGER,
  scraped_at TIMESTAMPTZ,
  UNIQUE (direction_id, username)
);

CREATE TABLE IF NOT EXISTS vk_members (
  id BIGSERIAL PRIMARY KEY,
  vk_group_id BIGINT NOT NULL REFERENCES vk_groups(id) ON DELETE CASCADE,
  vk_user_id TEXT NOT NULL,
  full_name TEXT,
  gender TEXT,
  university TEXT,
  school TEXT,
  scraped_at TIMESTAMPTZ,
  UNIQUE (vk_group_id, vk_user_id)
);

CREATE TABLE IF NOT EXISTS instagram_users (
  id BIGSERIAL PRIMARY KEY,
  instagram_account_id BIGINT NOT NULL REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  url TEXT,
  bio TEXT,
  location TEXT,
  scraped_at TIMESTAMPTZ,
  UNIQUE (instagram_account_id, username)
);

CREATE TABLE IF NOT EXISTS tiktok_users (
  id BIGSERIAL PRIMARY KEY,
  tiktok_account_id BIGINT NOT NULL REFERENCES tiktok_accounts(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  url TEXT,
  location TEXT,
  followers_count INTEGER,
  scraped_at TIMESTAMPTZ,
  UNIQUE (tiktok_account_id, username)
);

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id BIGSERIAL PRIMARY KEY,
  service_name TEXT NOT NULL,
  direction_id BIGINT REFERENCES directions(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scrape_logs (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES scrape_jobs(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vk_members_group_id ON vk_members(vk_group_id);
CREATE INDEX IF NOT EXISTS idx_instagram_users_account_id ON instagram_users(instagram_account_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_users_account_id ON tiktok_users(tiktok_account_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_job_id ON scrape_logs(job_id);
