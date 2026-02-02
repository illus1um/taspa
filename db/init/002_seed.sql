-- Seed data for frontend development (no real scraping)

-- Directions
INSERT INTO directions (id, name)
VALUES
  (1, 'Madhal'),
  (2, 'EduTech')
ON CONFLICT DO NOTHING;

-- Directions (extra)
INSERT INTO directions (id, name)
VALUES
  (3, 'HealthCare'),
  (4, 'Sports'),
  (5, 'Retail')
ON CONFLICT DO NOTHING;

-- Direction sources
INSERT INTO direction_sources (id, direction_id, source_type, source_identifier, created_at)
VALUES
  (1, 1, 'vk_group', 'club123456', NOW() - INTERVAL '10 days'),
  (2, 1, 'vk_group', 'club654321', NOW() - INTERVAL '10 days'),
  (3, 1, 'instagram_account', 'madhal.kz', NOW() - INTERVAL '9 days'),
  (4, 1, 'tiktok_account', 'madhal_media', NOW() - INTERVAL '9 days'),
  (5, 2, 'vk_group', 'club111111', NOW() - INTERVAL '8 days'),
  (6, 2, 'instagram_account', 'edutech.kz', NOW() - INTERVAL '7 days'),
  (7, 2, 'tiktok_account', 'edutech_kz', NOW() - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- Direction sources (extra)
INSERT INTO direction_sources (id, direction_id, source_type, source_identifier, created_at)
VALUES
  (8, 1, 'vk_group', 'club777777', NOW() - INTERVAL '6 days'),
  (9, 1, 'instagram_account', 'madhal_official', NOW() - INTERVAL '6 days'),
  (10, 2, 'vk_group', 'club222222', NOW() - INTERVAL '6 days'),
  (11, 2, 'instagram_account', 'edutech_students', NOW() - INTERVAL '5 days'),
  (12, 2, 'tiktok_account', 'edutech_world', NOW() - INTERVAL '5 days'),
  (13, 3, 'vk_group', 'club333333', NOW() - INTERVAL '5 days'),
  (14, 3, 'vk_group', 'club333334', NOW() - INTERVAL '5 days'),
  (15, 3, 'instagram_account', 'healthcare_kz', NOW() - INTERVAL '4 days'),
  (16, 3, 'tiktok_account', 'healthcare_daily', NOW() - INTERVAL '4 days'),
  (17, 4, 'vk_group', 'club444444', NOW() - INTERVAL '4 days'),
  (18, 4, 'instagram_account', 'sports.kz', NOW() - INTERVAL '4 days'),
  (19, 4, 'tiktok_account', 'sports_daily', NOW() - INTERVAL '4 days'),
  (20, 5, 'vk_group', 'club555555', NOW() - INTERVAL '3 days'),
  (21, 5, 'instagram_account', 'retail_kz', NOW() - INTERVAL '3 days'),
  (22, 5, 'tiktok_account', 'retail_daily', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- VK groups
INSERT INTO vk_groups (id, direction_id, vk_group_id, name, members_count, scraped_at)
VALUES
  (1, 1, 'club123456', 'Madhal Community', 12450, NOW() - INTERVAL '3 days'),
  (2, 1, 'club654321', 'Madhal Events', 8450, NOW() - INTERVAL '3 days'),
  (3, 2, 'club111111', 'EduTech Kazakhstan', 5600, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- VK groups (extra)
INSERT INTO vk_groups (id, direction_id, vk_group_id, name, members_count, scraped_at)
VALUES
  (4, 1, 'club777777', 'Madhal Media', 15600, NOW() - INTERVAL '2 days'),
  (5, 2, 'club222222', 'EduTech Community', 7200, NOW() - INTERVAL '2 days'),
  (6, 3, 'club333333', 'HealthCare KZ', 4300, NOW() - INTERVAL '1 day'),
  (7, 3, 'club333334', 'Healthy Life KZ', 2500, NOW() - INTERVAL '1 day'),
  (8, 4, 'club444444', 'Sports KZ', 9800, NOW() - INTERVAL '1 day'),
  (9, 5, 'club555555', 'Retail Market KZ', 3100, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- VK members
INSERT INTO vk_members (id, vk_group_id, vk_user_id, full_name, gender, university, school, scraped_at)
VALUES
  (1, 1, 'vk_1001', 'Айбек Нурланов', 'male', 'КБТУ', 'Школа №12', NOW() - INTERVAL '3 days'),
  (2, 1, 'vk_1002', 'Алия Смагулова', 'female', 'КазНУ', 'Школа №56', NOW() - INTERVAL '3 days'),
  (3, 1, 'vk_1003', 'Арман Тлеуов', 'male', 'КБТУ', 'Школа №12', NOW() - INTERVAL '3 days'),
  (4, 2, 'vk_2001', 'Диана Касымова', 'female', 'SDU', 'Лицей №1', NOW() - INTERVAL '2 days'),
  (5, 2, 'vk_2002', 'Руслан Абдрахманов', 'male', 'КазНУ', 'Школа №56', NOW() - INTERVAL '2 days'),
  (6, 3, 'vk_3001', 'Мария Иванова', 'female', 'КБТУ', 'Школа №20', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- VK members (extra)
INSERT INTO vk_members (id, vk_group_id, vk_user_id, full_name, gender, university, school, scraped_at)
VALUES
  (7, 1, 'vk_1004', 'Жандос Кудайберген', 'male', 'Satbayev University', 'Школа №77', NOW() - INTERVAL '6 days'),
  (8, 1, 'vk_1005', 'Айгуль Сакенова', 'female', 'AITU', 'Школа №5', NOW() - INTERVAL '5 days'),
  (9, 2, 'vk_2003', 'Нурсултан Ибраев', 'male', 'КазНУ', 'Гимназия №8', NOW() - INTERVAL '4 days'),
  (10, 2, 'vk_2004', 'Асель Нуртаева', 'female', 'SDU', 'Школа №12', NOW() - INTERVAL '3 days'),
  (11, 3, 'vk_3002', 'Карина Бекова', 'female', 'KIMEP', 'Школа №56', NOW() - INTERVAL '3 days'),
  (12, 3, 'vk_3003', 'Ержан Ахметов', 'male', NULL, NULL, NOW() - INTERVAL '2 days'),
  (13, 4, 'vk_4001', 'Сергей Петров', 'male', 'КБТУ', 'Школа №20', NOW() - INTERVAL '2 days'),
  (14, 4, 'vk_4002', 'Айдана Сейтова', 'female', 'КазГАСА', 'Школа №12', NOW() - INTERVAL '1 day'),
  (15, 4, 'vk_4003', 'Владимир Смирнов', NULL, NULL, 'Лицей №1', NOW() - INTERVAL '1 day'),
  (16, 5, 'vk_5001', 'Дарина Ким', 'female', 'КазНУ', 'Школа №56', NOW() - INTERVAL '2 days'),
  (17, 5, 'vk_5002', 'Талгат Омаров', 'male', 'SDU', 'Школа №5', NOW() - INTERVAL '1 day'),
  (18, 6, 'vk_6001', 'Гульнара Есенова', 'female', 'КБТУ', 'Гимназия №8', NOW() - INTERVAL '2 days'),
  (19, 6, 'vk_6002', 'Максат Сарсенов', 'male', 'AITU', 'Школа №77', NOW() - INTERVAL '1 day'),
  (20, 7, 'vk_7001', 'Алия Касымова', 'female', 'КазНУ', 'Школа №20', NOW() - INTERVAL '1 day'),
  (21, 8, 'vk_8001', 'Данияр Садыков', 'male', 'SDU', 'Школа №12', NOW() - INTERVAL '1 day'),
  (22, 8, 'vk_8002', 'София Мельник', 'female', 'KIMEP', 'Школа №56', NOW() - INTERVAL '1 day'),
  (23, 9, 'vk_9001', 'Екатерина Орлова', 'female', 'КБТУ', NULL, NOW() - INTERVAL '1 day'),
  (24, 2, 'vk_2005', 'Руслан Каирбек', 'male', NULL, 'Школа №12', NOW() - INTERVAL '6 days'),
  (25, 1, 'vk_1006', 'Александра Иванова', 'female', 'КазНУ', 'Школа №5', NOW() - INTERVAL '7 days'),
  (26, 3, 'vk_3004', 'Мухтар Жумабек', 'male', 'SDU', 'Лицей №1', NOW() - INTERVAL '5 days'),
  (27, 4, 'vk_4004', 'Мария Павлова', 'female', 'AITU', 'Школа №77', NOW() - INTERVAL '4 days'),
  (28, 5, 'vk_5003', 'Айбек Касымов', 'male', 'KIMEP', 'Школа №20', NOW() - INTERVAL '3 days'),
  (29, 6, 'vk_6003', 'Сауле Токтар', 'female', NULL, NULL, NOW() - INTERVAL '2 days'),
  (30, 8, 'vk_8003', 'Диас Тлеужан', 'male', 'КБТУ', 'Школа №12', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Instagram accounts
INSERT INTO instagram_accounts (id, direction_id, username, url, bio, location, scraped_at)
VALUES
  (1, 1, 'madhal.kz', 'https://instagram.com/madhal.kz', 'Media & events', 'Алматы', NOW() - INTERVAL '2 days'),
  (2, 2, 'edutech.kz', 'https://instagram.com/edutech.kz', 'EdTech platform', 'Астана', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Instagram accounts (extra)
INSERT INTO instagram_accounts (id, direction_id, username, url, bio, location, scraped_at)
VALUES
  (3, 1, 'madhal_official', 'https://instagram.com/madhal_official', 'Official', 'Алматы', NOW() - INTERVAL '1 day'),
  (4, 2, 'edutech_students', 'https://instagram.com/edutech_students', 'Students community', 'Астана', NOW() - INTERVAL '1 day'),
  (5, 3, 'healthcare_kz', 'https://instagram.com/healthcare_kz', 'Healthcare news', 'Алматы', NOW() - INTERVAL '1 day'),
  (6, 4, 'sports.kz', 'https://instagram.com/sports.kz', 'Sports media', 'Алматы', NOW() - INTERVAL '1 day'),
  (7, 5, 'retail_kz', 'https://instagram.com/retail_kz', 'Retail market', 'Шымкент', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Instagram users
INSERT INTO instagram_users (id, instagram_account_id, username, url, bio, location, scraped_at)
VALUES
  (1, 1, 'user_madhal_1', 'https://instagram.com/user_madhal_1', 'Marketing', 'Алматы', NOW() - INTERVAL '2 days'),
  (2, 1, 'user_madhal_2', 'https://instagram.com/user_madhal_2', 'Designer', 'Алматы', NOW() - INTERVAL '2 days'),
  (3, 2, 'user_edutech_1', 'https://instagram.com/user_edutech_1', 'Student', 'Астана', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Instagram users (extra)
INSERT INTO instagram_users (id, instagram_account_id, username, url, bio, location, scraped_at)
VALUES
  (4, 1, 'user_madhal_3', 'https://instagram.com/user_madhal_3', 'SMM', 'Алматы', NOW() - INTERVAL '1 day'),
  (5, 2, 'user_edutech_2', 'https://instagram.com/user_edutech_2', 'Developer', 'Астана', NOW() - INTERVAL '1 day'),
  (6, 2, 'user_edutech_3', 'https://instagram.com/user_edutech_3', 'Analyst', 'Астана', NOW() - INTERVAL '1 day'),
  (7, 3, 'health_user_1', 'https://instagram.com/health_user_1', 'Doctor', 'Алматы', NOW() - INTERVAL '1 day'),
  (8, 3, 'health_user_2', 'https://instagram.com/health_user_2', 'Nurse', 'Алматы', NOW() - INTERVAL '1 day'),
  (9, 4, 'edustudent_1', 'https://instagram.com/edustudent_1', 'Student', 'Астана', NOW() - INTERVAL '1 day'),
  (10, 5, 'medlife_1', 'https://instagram.com/medlife_1', 'Lifestyle', 'Алматы', NOW() - INTERVAL '1 day'),
  (11, 6, 'sportfan_1', 'https://instagram.com/sportfan_1', 'Athlete', 'Алматы', NOW() - INTERVAL '1 day'),
  (12, 7, 'retail_user_1', 'https://instagram.com/retail_user_1', 'Sales', 'Шымкент', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- TikTok accounts
INSERT INTO tiktok_accounts (id, direction_id, username, url, location, followers_count, scraped_at)
VALUES
  (1, 1, 'madhal_media', 'https://tiktok.com/@madhal_media', 'Алматы', 48200, NOW() - INTERVAL '1 day'),
  (2, 2, 'edutech_kz', 'https://tiktok.com/@edutech_kz', 'Астана', 23500, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- TikTok accounts (extra)
INSERT INTO tiktok_accounts (id, direction_id, username, url, location, followers_count, scraped_at)
VALUES
  (3, 1, 'madhal_trends', 'https://tiktok.com/@madhal_trends', 'Алматы', 15000, NOW() - INTERVAL '1 day'),
  (4, 2, 'edutech_world', 'https://tiktok.com/@edutech_world', 'Астана', 12000, NOW() - INTERVAL '1 day'),
  (5, 3, 'healthcare_daily', 'https://tiktok.com/@healthcare_daily', 'Алматы', 9800, NOW() - INTERVAL '1 day'),
  (6, 4, 'sports_daily', 'https://tiktok.com/@sports_daily', 'Алматы', 22000, NOW() - INTERVAL '1 day'),
  (7, 5, 'retail_daily', 'https://tiktok.com/@retail_daily', 'Шымкент', 7600, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- TikTok users
INSERT INTO tiktok_users (id, tiktok_account_id, username, url, location, followers_count, scraped_at)
VALUES
  (1, 1, 'madhal_fan_1', 'https://tiktok.com/@madhal_fan_1', 'Алматы', 1200, NOW() - INTERVAL '1 day'),
  (2, 1, 'madhal_fan_2', 'https://tiktok.com/@madhal_fan_2', 'Алматы', 2200, NOW() - INTERVAL '1 day'),
  (3, 2, 'edutech_fan_1', 'https://tiktok.com/@edutech_fan_1', 'Астана', 1800, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- TikTok users (extra)
INSERT INTO tiktok_users (id, tiktok_account_id, username, url, location, followers_count, scraped_at)
VALUES
  (4, 3, 'madhal_fan_3', 'https://tiktok.com/@madhal_fan_3', 'Алматы', 900, NOW() - INTERVAL '1 day'),
  (5, 3, 'madhal_fan_4', 'https://tiktok.com/@madhal_fan_4', 'Алматы', 1400, NOW() - INTERVAL '1 day'),
  (6, 4, 'edutech_fan_2', 'https://tiktok.com/@edutech_fan_2', 'Астана', 1300, NOW() - INTERVAL '1 day'),
  (7, 5, 'health_fan_1', 'https://tiktok.com/@health_fan_1', 'Алматы', 700, NOW() - INTERVAL '1 day'),
  (8, 5, 'health_fan_2', 'https://tiktok.com/@health_fan_2', 'Алматы', 800, NOW() - INTERVAL '1 day'),
  (9, 6, 'sport_fan_1', 'https://tiktok.com/@sport_fan_1', 'Алматы', 2100, NOW() - INTERVAL '1 day'),
  (10, 6, 'sport_fan_2', 'https://tiktok.com/@sport_fan_2', 'Алматы', 1900, NOW() - INTERVAL '1 day'),
  (11, 7, 'retail_fan_1', 'https://tiktok.com/@retail_fan_1', 'Шымкент', 600, NOW() - INTERVAL '1 day'),
  (12, 4, 'edutech_fan_3', 'https://tiktok.com/@edutech_fan_3', 'Астана', 900, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Scrape jobs + logs (demo)
INSERT INTO scrape_jobs (id, service_name, direction_id, status, started_at, finished_at, created_at)
VALUES
  (1, 'vk', 1, 'finished', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '10 minutes', NOW() - INTERVAL '3 days'),
  (2, 'instagram', 1, 'finished', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '8 minutes', NOW() - INTERVAL '2 days'),
  (3, 'tiktok', 2, 'running', NOW() - INTERVAL '1 hour', NULL, NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- Scrape jobs (extra)
INSERT INTO scrape_jobs (id, service_name, direction_id, status, started_at, finished_at, created_at)
VALUES
  (4, 'vk', 1, 'failed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '5 minutes', NOW() - INTERVAL '1 day'),
  (5, 'instagram', 2, 'queued', NULL, NULL, NOW() - INTERVAL '2 hours'),
  (6, 'tiktok', 3, 'finished', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '12 minutes', NOW() - INTERVAL '2 days'),
  (7, 'vk', 4, 'stopped', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '3 hours'),
  (8, 'instagram', 5, 'finished', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '7 minutes', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO scrape_logs (id, job_id, level, message, created_at)
VALUES
  (1, 1, 'info', 'VK scrape finished успешно', NOW() - INTERVAL '3 days' + INTERVAL '9 minutes'),
  (2, 2, 'info', 'Instagram scrape finished успешно', NOW() - INTERVAL '2 days' + INTERVAL '7 minutes'),
  (3, 3, 'warning', 'TikTok scrape: ограничение по RPM', NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

-- Scrape logs (extra)
INSERT INTO scrape_logs (id, job_id, level, message, created_at)
VALUES
  (4, 4, 'error', 'VK scrape failed: rate limit', NOW() - INTERVAL '1 day' + INTERVAL '4 minutes'),
  (5, 5, 'info', 'Instagram scrape queued', NOW() - INTERVAL '2 hours'),
  (6, 6, 'info', 'TikTok scrape finished успешно', NOW() - INTERVAL '2 days' + INTERVAL '11 minutes'),
  (7, 7, 'warning', 'Scrape stopped by developer', NOW() - INTERVAL '2 hours'),
  (8, 8, 'info', 'Instagram scrape finished успешно', NOW() - INTERVAL '1 day' + INTERVAL '6 minutes')
ON CONFLICT DO NOTHING;

-- Bump sequences to avoid conflicts
SELECT setval('directions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM directions));
SELECT setval('direction_sources_id_seq', (SELECT COALESCE(MAX(id), 1) FROM direction_sources));
SELECT setval('vk_groups_id_seq', (SELECT COALESCE(MAX(id), 1) FROM vk_groups));
SELECT setval('vk_members_id_seq', (SELECT COALESCE(MAX(id), 1) FROM vk_members));
SELECT setval('instagram_accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM instagram_accounts));
SELECT setval('instagram_users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM instagram_users));
SELECT setval('tiktok_accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tiktok_accounts));
SELECT setval('tiktok_users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tiktok_users));
SELECT setval('scrape_jobs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM scrape_jobs));
SELECT setval('scrape_logs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM scrape_logs));
