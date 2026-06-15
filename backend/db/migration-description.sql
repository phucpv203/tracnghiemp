-- Migration: Add description column to courses table
-- Chạy migration này để thêm trường mô tả cho môn học

ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- Cập nhật mô tả mẫu cho các môn học hiện có (nếu cần)
UPDATE courses SET description = 'Môn học: ' || title WHERE description = '';