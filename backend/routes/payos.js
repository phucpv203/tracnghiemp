/**
 * Route PayOS - Xử lý thanh toán qua PayOS
 */
import { Router } from 'express';
import { query } from '../services/db.js';
import { requireAuth } from '../middleware/auth.js';
import { createPaymentLink, getPaymentInfo } from '../services/payosService.js';

const router = Router();

/**
 * POST /payos/create-payment
 * Tạo link thanh toán PayOS cho gói nạp điểm
 * Body: { points: number }
 */
router.post('/create-payment', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { points } = req.body;

    // Bảng giá: mỗi 1 điểm = 1000 VNĐ
    const PRICE_PER_POINT = 1000;
    const allowedPoints = [100, 200, 300];
    if (!allowedPoints.includes(points)) {
      return res.status(400).json({ message: 'Chỉ chấp nhận gói 100, 200 hoặc 300 điểm.' });
    }

    const amount = points * PRICE_PER_POINT;

    // Tạo mã đơn hàng: timestamp + userId (unique)
    const orderCode = Number(`${Date.now()}${userId}`.slice(-19));

    // Lưu đơn hàng vào payment_history (trạng thái pending)
    const userRes = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    await query(
      `INSERT INTO payment_history (user_id, order_code, amount, points, buyer_name, buyer_email)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, orderCode, amount, points, user.name, user.email]
    );

    // Gọi PayOS tạo link thanh toán
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const result = await createPaymentLink({
      orderCode,
      amount,
      description: `Nạp ${points} điểm`,
      returnUrl: `${baseUrl}/topup?status=success&orderCode=${orderCode}&points=${points}`,
      cancelUrl: `${baseUrl}/topup?status=cancelled&orderCode=${orderCode}`,
      buyerName: user.name,
      buyerEmail: user.email,
    });

    // Cập nhật payment_link_id
    await query(
      'UPDATE payment_history SET payment_link_id = $1 WHERE order_code = $2',
      [result.paymentLinkId, orderCode]
    );

    res.json({
      checkoutUrl: result.checkoutUrl,
      orderCode,
      paymentLinkId: result.paymentLinkId,
    });
  } catch (error) {
    console.error('[PayOS] Create payment error:', error);
    res.status(500).json({ message: error.message || 'Lỗi khi tạo link thanh toán.' });
  }
});

/**
 * GET /payos/check-payment/:orderCode
 * Kiểm tra trạng thái thanh toán của một đơn hàng
 */
router.get('/check-payment/:orderCode', requireAuth, async (req, res) => {
  try {
    const orderCode = Number(req.params.orderCode);

    const result = await query(
      'SELECT * FROM payment_history WHERE order_code = $1 AND user_id = $2',
      [orderCode, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    }

    const payment = result.rows[0];

    // Nếu đang pending, query PayOS để lấy trạng thái mới nhất
    if (payment.status === 'pending' && payment.payment_link_id) {
      try {
        const info = await getPaymentInfo(payment.payment_link_id);
        if (info.status === 'PAID' && payment.status !== 'paid') {
          // Thanh toán thành công → cộng điểm
          await query(
            'UPDATE payment_history SET status = $1, paid_at = NOW(), updated_at = NOW() WHERE order_code = $2',
            ['paid', orderCode]
          );
          await query(
            'UPDATE users SET points = points + $1, updated_at = NOW() WHERE id = $2',
            [payment.points, req.user.id]
          );
          payment.status = 'paid';
        } else if (info.status === 'CANCELLED' && payment.status === 'pending') {
          await query(
            'UPDATE payment_history SET status = $1, updated_at = NOW() WHERE order_code = $2',
            ['cancelled', orderCode]
          );
          payment.status = 'cancelled';
        }
      } catch (_) {
        // Không query được PayOS thì bỏ qua, dùng dữ liệu trong DB
      }
    }

    res.json({
      orderCode: payment.order_code,
      status: payment.status,
      points: payment.points,
      amount: payment.amount,
      paidAt: payment.paid_at,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /payos/webhook
 * Webhook từ PayOS thông báo kết quả thanh toán
 * Lưu ý: Cần cấu hình Webhook URL trên PayOS Dashboard
 */
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('[PayOS] Webhook received:', body);

    // Xác thực webhook (nếu có checksum key)
    // Có thể bỏ qua để test, nhưng production nên verify

    const orderCode = body.orderCode;
    const status = body.status; // 'PAID' | 'CANCELLED'

    if (!orderCode || !status) {
      return res.status(400).json({ message: 'Invalid webhook data' });
    }

    const paymentRes = await query(
      'SELECT * FROM payment_history WHERE order_code = $1',
      [orderCode]
    );

    if (!paymentRes.rows.length) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const payment = paymentRes.rows[0];

    if (status === 'PAID' && payment.status === 'pending') {
      // Cộng điểm cho user
      await query(
        'UPDATE payment_history SET status = $1, paid_at = NOW(), updated_at = NOW() WHERE order_code = $2',
        ['paid', orderCode]
      );
      await query(
        'UPDATE users SET points = points + $1, updated_at = NOW() WHERE id = $2',
        [payment.points, payment.user_id]
      );
      console.log(`[PayOS] User ${payment.user_id} topped up ${payment.points} points (order ${orderCode})`);
    } else if (status === 'CANCELLED' && payment.status === 'pending') {
      await query(
        'UPDATE payment_history SET status = $1, updated_at = NOW() WHERE order_code = $2',
        ['cancelled', orderCode]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[PayOS] Webhook error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;