-- Migration: Add last_device_change_at to users for weekly device change limit
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_device_change_at TIMESTAMPTZ;