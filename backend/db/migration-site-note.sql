-- Migration: Thêm bảng site_notes để lưu dòng lưu ý trên dashboard
CREATE TABLE IF NOT EXISTS site_notes (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert một dòng mặc định nếu chưa có
INSERT INTO site_notes (content)
SELECT '' WHERE NOT EXISTS (SELECT 1 FROM site_notes);