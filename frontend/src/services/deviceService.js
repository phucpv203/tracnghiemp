/**
 * deviceService - Quản lý Device_ID trên trình duyệt
 *
 * - Sử dụng @fingerprintjs/fingerprintjs để tạo visitorId duy nhất dựa trên
 *   thông tin phần cứng và trình duyệt (thay vì UUID ngẫu nhiên như trước)
 * - Cache visitorId vào localStorage để dùng đồng bộ
 * - Lấy tên thiết bị từ User Agent
 */

import { fingerprintService } from './fingerprintService';

const DEVICE_NAME_KEY = 'quiz-app-device-name';

function getDeviceName() {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';

  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/MSIE|Trident/i.test(ua)) browser = 'IE';

  return `${browser} trên ${os}`;
}

export const deviceService = {
  /**
   * Lấy device_id từ Fingerprint.js
   * - Nếu đã cache fingerprint trong localStorage, trả về ngay (đồng bộ)
   * - Nếu chưa, init fingerprint (bất đồng bộ) và lấy visitorId
   */
  async getDeviceId() {
    // Thử lấy từ cache đồng bộ trước
    const cached = fingerprintService.getVisitorId();
    if (cached) return cached;

    // Nếu chưa có cache, init fingerprint
    return fingerprintService.init();
  },

  /** Lấy tên thiết bị từ User Agent */
  getDeviceName() {
    let deviceName = localStorage.getItem(DEVICE_NAME_KEY);
    if (!deviceName) {
      deviceName = getDeviceName();
      localStorage.setItem(DEVICE_NAME_KEY, deviceName);
    }
    return deviceName;
  },
};
