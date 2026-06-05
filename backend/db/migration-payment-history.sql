-- =============================================================
-- Migration: Bảng lịch sử thanh toán qua PayOS
-- =============================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  order_code BIGINT NOT NULL UNIQUE,           -- Mã đơn hàng (gửi lên PayOS)
  payment_link_id VARCHAR(64),                  -- ID payment link từ PayOS
  amount INTEGER NOT NULL,                      -- Số tiền VNĐ
  points INTEGER NOT NULL,                      -- Số điểm tương ứng
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | paid | cancelled
  buyer_name VARCHAR(255),
  buyer_email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_order_code ON payment_history(order_code);
CREATE INDEX IF NOT EXISTS idx_payment_history_payment_link_id ON payment_history(payment_link_id);