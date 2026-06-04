-- =============================================================
-- SETUP TOÀN BỘ DATABASE - Chạy 1 lần trong Supabase SQL Editor
-- =============================================================
-- File này gộp: schema.sql + migration-token-version.sql + add-user.sql
-- An toàn chạy lại nhiều lần (dùng IF NOT EXISTS / ON CONFLICT).
--
-- Nếu báo lỗi "relation already exists" → bỏ qua, đã có sẵn.
-- Nếu báo lỗi khác → gửi mình error message để debug.
-- =============================================================

-- ============== 1. TẠO BẢNG ==============

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  points NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  required_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT REFERENCES courses(id),
  content TEXT NOT NULL,
  difficulty SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answers (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id),
  title VARCHAR(255) NOT NULL,
  total_score INT NOT NULL DEFAULT 100,
  pass_score INT NOT NULL DEFAULT 80,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  course_id BIGINT NOT NULL REFERENCES courses(id),
  score NUMERIC(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'learning',
  last_exam_id BIGINT REFERENCES exams(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS course_prerequisites (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id),
  prerequisite_course_id BIGINT NOT NULL REFERENCES courses(id),
  min_score NUMERIC(10,2) NOT NULL DEFAULT 80,
  UNIQUE (course_id, prerequisite_course_id)
);

-- ============== 2. THÊM CỘT token_version (cho "1 tài khoản 1 thiết bị") ==============

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_users_token_version ON users(id, token_version);

-- ============== 3. TẠO USER MẪU (bcrypt hash đã generate sẵn) ==============
-- password = admin123
-- password = user123
-- Lưu ý: $2a$10$... là bcrypt hash, KHÔNG phải plain text

INSERT INTO users (name, email, password_hash, role, points, token_version, created_at, updated_at)
VALUES
  ('Admin', 'admin@tracnghiem.com', '$2a$10$V/MS7tK/q45MSz0CU1531.GlIIDTDi7TGx3yQlu2viYy4Xk20unxi', 'admin', 1000, 0, now(), now()),
  ('Nguyễn Văn A', 'user@tracnghiem.com', '$2a$10$.OerHttCBPrw7hwiNgddlez9.uIE535au0Rk6VTskhs.30pg5fRkC', 'user', 100, 0, now(), now())
ON CONFLICT (email) DO UPDATE
  SET name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      points = EXCLUDED.points,
      token_version = EXCLUDED.token_version,
      updated_at = now();

-- ============== 4. KIỂM TRA ==============
-- Chạy query này sau khi setup xong để xác nhận:
-- SELECT id, name, email, role, points, token_version FROM users;
