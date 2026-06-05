/**
 * payosService - Tích hợp cổng thanh toán PayOS
 *
 * API Doc: https://payos.vn/docs/api/
 * Cần set biến môi trường:
 *   PAYOS_CLIENT_ID
 *   PAYOS_API_KEY
 *   PAYOS_CHECKSUM_KEY
 */
import crypto from 'crypto';

const PAYOS_API_BASE = 'https://api-merchant.payos.vn/v2';

function getClientId() {
  return process.env.PAYOS_CLIENT_ID;
}

function getApiKey() {
  return process.env.PAYOS_API_KEY;
}

function getChecksumKey() {
  return process.env.PAYOS_CHECKSUM_KEY;
}

/**
 * Tạo chữ ký HMAC-SHA256 cho request
 */
function createSignature(data) {
  const checksumKey = getChecksumKey();
  if (!checksumKey) return '';
  const sortedKeys = Object.keys(data).sort();
  const signStr = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  return crypto.createHmac('sha256', checksumKey).update(signStr).digest('hex');
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
 * @returns {Promise<{ checkoutUrl: string, paymentLinkId: string }>}
 */
export async function createPaymentLink(params) {
  const clientId = getClientId();
  const apiKey = getApiKey();

  if (!clientId || !apiKey) {
    throw new Error('PAYOS_CLIENT_ID hoặc PAYOS_API_KEY chưa được cấu hình.');
  }

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

  // Thêm signature nếu có checksum key
  const checksumKey = getChecksumKey();
  if (checksumKey) {
    body.signature = createSignature(body);
  }

  console.log('[PayOS] Creating payment link:', { orderCode: params.orderCode, amount: params.amount });

  const response = await fetch(`${PAYOS_API_BASE}/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[PayOS] Create payment link failed:', response.status, errorBody);
    throw new Error(`PayOS error: ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  console.log('[PayOS] Payment link created:', data);

  if (data.code !== '00') {
    throw new Error(`PayOS error: ${data.desc || 'Unknown error'}`);
  }

  return {
    checkoutUrl: data.data.checkoutUrl,
    paymentLinkId: data.data.id,
    orderCode: data.data.orderCode,
  };
}

/**
 * Kiểm tra trạng thái thanh toán
 */
export async function getPaymentInfo(paymentLinkId) {
  const clientId = getClientId();
  const apiKey = getApiKey();

  if (!clientId || !apiKey) {
    throw new Error('PAYOS_CLIENT_ID hoặc PAYOS_API_KEY chưa được cấu hình.');
  }

  const response = await fetch(`${PAYOS_API_BASE}/payment-requests/${paymentLinkId}`, {
    method: 'GET',
    headers: {
      'x-client-id': clientId,
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`PayOS getPaymentInfo failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Xác thực webhook signature từ PayOS
 */
export function verifyWebhookSignature(reqBody, signature) {
  const checksumKey = getChecksumKey();
  if (!checksumKey) return false;

  const sortedKeys = Object.keys(reqBody).sort();
  const signStr = sortedKeys.map(key => `${key}=${reqBody[key]}`).join('&');
  const expected = crypto.createHmac('sha256', checksumKey).update(signStr).digest('hex');
  return expected === signature;
}