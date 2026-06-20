-- Migration: Add question_type to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS question_type VARCHAR(10) NOT NULL DEFAULT 'choice' CHECK (question_type IN ('choice', 'fill'));