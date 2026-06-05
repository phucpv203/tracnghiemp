/**
 * payosService - Tích hợp cổng thanh toán PayOS (dùng SDK chính thức)
 *
 * Cần set biến môi trường:
 *   PAYOS_CLIENT_ID
 *   PAYOS_API_KEY
 *   PAYOS_CHECKSUM_KEY
 */
import PayOS from '@payos/node';

let payosInstance = null;

function getPayOS() {
  if (!payosInstance) {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error('PAYOS_CLIENT_ID, PAYOS_API_KEY và PAYOS_CHECKSUM_KEY phải được cấu hình.');
    }

    payosInstance = new PayOS(clientId, apiKey, checksumKey);
  }
  return payosInstance;
}

/**
 * Tạo link thanh toán PayOS
 * 
 * @param {Object} params
 * @param {number} params.orderCode - Mã đơn hàng (số nguyên, unique)
 * @param {number} params.amount - Số tiền (VNĐ)
 * @param {string} params.description - Mô tả đơn hàng
 * @param {string} params.returnUrl - URL chuyển hướng sau khi thanh toán thành công
 * @param {string} params.cancelUrl - URL chuyển hướng sau khi huỷ
 * @param {string} params.buyerName - Tên người mua (tuỳ chọn)
 * @param {string} params.buyerEmail - Email (tuỳ chọn)
 * @param {string} params.buyerPhone - SĐT (tuỳ chọn)
 * @param {string} params.buyerAddress - Địa chỉ (tuỳ chọn)
 * @returns {Promise<{ checkoutUrl: string, paymentLinkId: string }>}
 */
export async function createPaymentLink(params) {
  const payos = getPayOS();

  const body = {
    orderCode: params.orderCode,
    amount: params.amount,
    description: params.description || 'Nạp điểm',
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
    buyerName: params.buyerName || '',
    buyerEmail: params.buyerEmail || '',
    buyerPhone: params.buyerPhone || '',
    buyerAddress: params.buyerAddress || '',
    expiredAt: Math.floor(Date.now() / 1000) + 1800, // Hết hạn sau 30 phút
  };

  console.log('[PayOS] Creating payment link:', { orderCode: params.orderCode, amount: params.amount });

  // Dùng SDK: payos.paymentRequests.create(data) thay vì gọi API thủ công
  const response = await payos.paymentRequests.create(body);

  return {
    checkoutUrl: response.checkoutUrl,
    paymentLinkId: response.id,
    orderCode: response.orderCode,
  };
}

/**
 * Kiểm tra trạng thái thanh toán từ paymentLinkId
 */
export async function getPaymentInfo(paymentLinkId) {
  const payos = getPayOS();
  // Dùng SDK: payos.paymentRequests.get(id)
  const response = await payos.paymentRequests.get(paymentLinkId);
  return response;
}

/**
 * Xác thực webhook signature từ PayOS (dùng SDK)
 * 
 * @param {Object} webhookBody - Toàn bộ body từ webhook: { code, desc, data, signature }
 * @returns {boolean}
 */
export async function verifyWebhookSignature(webhookBody) {
  try {
    const payos = getPayOS();
    // SDK: payos.webhooks.verify(webhookBody) - async, ném lỗi nếu không hợp lệ
    await payos.webhooks.verify(webhookBody);
    return true;
  } catch (error) {
    console.error('[PayOS] Webhook signature verification failed:', error.message);
    return false;
  }
}
