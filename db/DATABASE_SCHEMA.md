# TASPA Database Schema

## Полная схема базы данных со всеми таблицами, полями и связями

---

## 1. **users** - Пользователи системы
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `email` | TEXT | UNIQUE, email пользователя |
| `password_hash` | TEXT | Хэш пароля |
| `first_name` | TEXT | Имя |
| `last_name` | TEXT | Фамилия |
| `is_active` | BOOLEAN | Активен ли пользователь (default: true) |
| `refresh_token_hash` | TEXT | Хэш refresh токена |
| `refresh_token_expires_at` | TIMESTAMPTZ | Время истечения refresh токена |
| `created_at` | TIMESTAMPTZ | Дата создания (default: NOW()) |

**Связи:**
- → `user_roles.user_id` (One-to-Many)

---

## 2. **roles** - Роли пользователей
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `name` | TEXT | UNIQUE, название роли |

**Связи:**
- → `user_roles.role_id` (One-to-Many)

---

## 3. **user_roles** - Связь пользователей и ролей (Many-to-Many)
| Поле | Тип | Описание |
|------|-----|----------|
| `user_id` | BIGINT | PK, FK → users.id (CASCADE DELETE) |
| `role_id` | BIGINT | PK, FK → roles.id (CASCADE DELETE) |

**Индексы:**
- PRIMARY KEY (user_id, role_id)

---

## 4. **directions** - Направления исследования
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `name` | TEXT | UNIQUE, название направления |
| `created_at` | TIMESTAMPTZ | Дата создания (default: NOW()) |

**Связи:**
- → `direction_sources.direction_id` (One-to-Many)
- → `vk_groups.direction_id` (One-to-Many)
- → `instagram_accounts.direction_id` (One-to-Many)
- → `tiktok_accounts.direction_id` (One-to-Many)
- → `scrape_jobs.direction_id` (One-to-Many, SET NULL on delete)

---

## 5. **direction_sources** - Источники данных для направлений
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `direction_id` | BIGINT | FK → directions.id (CASCADE DELETE) |
| `source_type` | TEXT | CHECK: 'vk_group', 'instagram_account', 'tiktok_account' |
| `source_identifier` | TEXT | Идентификатор источника |
| `created_at` | TIMESTAMPTZ | Дата создания (default: NOW()) |

**Индексы:**
- UNIQUE (direction_id, source_type, source_identifier)

---

## 6. **vk_groups** - Группы ВКонтакте
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `direction_id` | BIGINT | FK → directions.id (CASCADE DELETE) |
| `vk_group_id` | TEXT | ID группы ВК |
| `name` | TEXT | Название группы |
| `url` | TEXT | **✅ НОВОЕ** Ссылка на группу |
| `members_count` | INTEGER | Количество участников |
| `scraped_at` | TIMESTAMPTZ | Дата/время сбора данных |

**Индексы:**
- UNIQUE (direction_id, vk_group_id)

**Связи:**
- → `vk_members.vk_group_id` (One-to-Many)

---

## 7. **vk_members** - Участники групп ВКонтакте
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `vk_group_id` | BIGINT | FK → vk_groups.id (CASCADE DELETE) |
| `vk_user_id` | TEXT | ID пользователя ВК |
| `full_name` | TEXT | ФИО |
| `gender` | TEXT | Пол (male/female) |
| `age` | INTEGER | **✅ НОВОЕ** Возраст |
| `city` | TEXT | **✅ НОВОЕ** Город |
| `university` | TEXT | Университет |
| `school` | TEXT | Школа |
| `last_recently` | TIMESTAMPTZ | **✅ НОВОЕ** Дата последней активности |
| `data_timestamp` | TIMESTAMPTZ | **✅ НОВОЕ** Временная метка данных |
| `scraped_at` | TIMESTAMPTZ | Дата/время сбора данных |

**Индексы:**
- UNIQUE (vk_group_id, vk_user_id)
- INDEX idx_vk_members_group_id ON (vk_group_id)

---

## 8. **instagram_accounts** - Аккаунты Instagram (источники)
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `direction_id` | BIGINT | FK → directions.id (CASCADE DELETE) |
| `username` | TEXT | Username аккаунта |
| `url` | TEXT | Ссылка на аккаунт |
| `name` | TEXT | **✅ НОВОЕ** Название группы/аккаунта |
| `bio` | TEXT | Биография |
| `location` | TEXT | Местоположение |
| `scraped_at` | TIMESTAMPTZ | Дата/время сбора данных |

**Индексы:**
- UNIQUE (direction_id, username)

**Связи:**
- → `instagram_users.instagram_account_id` (One-to-Many)

---

## 9. **instagram_users** - Пользователи Instagram
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `instagram_account_id` | BIGINT | FK → instagram_accounts.id (CASCADE DELETE) |
| `username` | TEXT | Username пользователя |
| `url` | TEXT | Ссылка на профиль |
| `bio` | TEXT | Биография |
| `location` | TEXT | Местоположение |
| `sex` | TEXT | **✅ НОВОЕ** Пол |
| `city` | TEXT | **✅ НОВОЕ** Город |
| `data_timestamp` | TIMESTAMPTZ | **✅ НОВОЕ** Временная метка данных |
| `scraped_at` | TIMESTAMPTZ | Дата/время сбора данных |

**Индексы:**
- UNIQUE (instagram_account_id, username)
- INDEX idx_instagram_users_account_id ON (instagram_account_id)

---

## 10. **tiktok_accounts** - Аккаунты TikTok (источники)
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `direction_id` | BIGINT | FK → directions.id (CASCADE DELETE) |
| `username` | TEXT | Username аккаунта |
| `url` | TEXT | Ссылка на аккаунт |
| `name` | TEXT | **✅ НОВОЕ** Название группы/аккаунта |
| `location` | TEXT | Местоположение |
| `followers_count` | INTEGER | Количество подписчиков |
| `scraped_at` | TIMESTAMPTZ | Дата/время сбора данных |

**Индексы:**
- UNIQUE (direction_id, username)

**Связи:**
- → `tiktok_users.tiktok_account_id` (One-to-Many)

---

## 11. **tiktok_users** - Пользователи TikTok
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `tiktok_account_id` | BIGINT | FK → tiktok_accounts.id (CASCADE DELETE) |
| `username` | TEXT | Username пользователя |
| `url` | TEXT | Ссылка на профиль |
| `location` | TEXT | Местоположение |
| `followers_count` | INTEGER | Количество подписчиков |
| `sex` | TEXT | **✅ НОВОЕ** Пол |
| `city` | TEXT | **✅ НОВОЕ** Город |
| `data_timestamp` | TIMESTAMPTZ | **✅ НОВОЕ** Временная метка данных |
| `scraped_at` | TIMESTAMPTZ | Дата/время сбора данных |

**Индексы:**
- UNIQUE (tiktok_account_id, username)
- INDEX idx_tiktok_users_account_id ON (tiktok_account_id)

---

## 12. **scrape_jobs** - Задачи скрапинга
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `service_name` | TEXT | Название сервиса (vk/instagram/tiktok) |
| `direction_id` | BIGINT | FK → directions.id (SET NULL on delete) |
| `status` | TEXT | Статус задачи |
| `started_at` | TIMESTAMPTZ | Время начала |
| `finished_at` | TIMESTAMPTZ | Время завершения |
| `created_at` | TIMESTAMPTZ | Дата создания (default: NOW()) |

**Связи:**
- → `scrape_logs.job_id` (One-to-Many)

---

## 13. **scrape_logs** - Логи скрапинга
| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGSERIAL | PK, автоинкремент |
| `job_id` | BIGINT | FK → scrape_jobs.id (CASCADE DELETE) |
| `level` | TEXT | Уровень лога (info/warning/error) |
| `message` | TEXT | Сообщение лога |
| `created_at` | TIMESTAMPTZ | Дата создания (default: NOW()) |

**Индексы:**
- INDEX idx_scrape_logs_job_id ON (job_id)

---

## Диаграмма связей

```
users ←→ user_roles ←→ roles

directions
    ↓ (One-to-Many, CASCADE)
    ├─→ direction_sources
    ├─→ vk_groups
    │       ↓ (One-to-Many, CASCADE)
    │       └─→ vk_members
    ├─→ instagram_accounts
    │       ↓ (One-to-Many, CASCADE)
    │       └─→ instagram_users
    ├─→ tiktok_accounts
    │       ↓ (One-to-Many, CASCADE)
    │       └─→ tiktok_users
    └─→ scrape_jobs (SET NULL)
            ↓ (One-to-Many, CASCADE)
            └─→ scrape_logs
```

---

## Изменения (добавленные поля) ✅

### VK:
- `vk_groups.url` - ссылка на группу
- `vk_members.age` - возраст
- `vk_members.city` - город
- `vk_members.last_recently` - дата последней активности
- `vk_members.data_timestamp` - временная метка данных

### Instagram:
- `instagram_accounts.name` - название группы/аккаунта
- `instagram_users.sex` - пол
- `instagram_users.city` - город
- `instagram_users.data_timestamp` - временная метка данных

### TikTok:
- `tiktok_accounts.name` - название группы/аккаунта
- `tiktok_users.sex` - пол
- `tiktok_users.city` - город
- `tiktok_users.data_timestamp` - временная метка данных

---

## Полный SQL дамп схемы

Полная схема базы данных сохранена в файле: [current_schema.sql](./current_schema.sql)
