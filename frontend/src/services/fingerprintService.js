/**
 * fingerprintService - Dịch vụ Fingerprint.js để nhận diện thiết bị thật
 *
 * - Sử dụng @fingerprintjs/fingerprintjs để lấy visitorId duy nhất dựa trên
 *   thông tin phần cứng và trình duyệt (thay vì UUID ngẫu nhiên như trước)
 * - Cache kết quả vào localStorage để dùng đồng bộ
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

const FP_KEY = 'quiz-app-fingerprint-v2';

let fpInstance = null;
let cachedId = localStorage.getItem(FP_KEY);

export const fingerprintService = {
  /**
   * Khởi tạo Fingerprint và lấy visitorId
   * Nên gọi một lần khi app khởi động (App.jsx)
   * Trả về visitorId đã cache
   */
  async init() {
    // Nếu đã có cache thì return luôn
    if (cachedId) {
      return cachedId;
    }

    // Kiểm tra xem đã có instance chưa, nếu chưa thì load
    if (!fpInstance) {
      fpInstance = await FingerprintJS.load();
    }

    // Lấy fingerprint
    const result = await fpInstance.get();
    cachedId = result.visitorId;

    // Cache vào localStorage
    localStorage.setItem(FP_KEY, cachedId);

    return cachedId;
  },

  /**
   * Lấy visitorId đã cache (đồng bộ)
   * Dùng cho các request API cần gửi deviceId ngay lập tức
   */
  getVisitorId() {
    if (cachedId) return cachedId;

    // Thử lấy từ localStorage trong trường hợp cache chưa được set
    const stored = localStorage.getItem(FP_KEY);
    if (stored) {
      cachedId = stored;
      return stored;
    }

    // Fallback: nếu chưa có gì, trả về null (sẽ được init sau)
    return null;
  },
};