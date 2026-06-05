/**
 * deviceService - Quản lý Device_ID trên trình duyệt
 *
 * - Sinh UUID ngẫu nhiên cho thiết bị
 * - Lưu vào localStorage với thời hạn 1 năm
 * - Lấy tên thiết bị từ User Agent
 */

const DEVICE_ID_KEY = 'quiz-app-device-id';
const DEVICE_NAME_KEY = 'quiz-app-device-name';
const EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 1 năm

function generateUUID() {
  // Tạo UUID v4 ngẫu nhiên
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
  /** Lấy device_id hiện tại, nếu chưa có thì tạo mới */
  getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    const savedTime = localStorage.getItem(DEVICE_ID_KEY + '-time');

    // Nếu chưa có hoặc đã hết hạn (1 năm) → tạo mới
    if (!deviceId || !savedTime || Date.now() - Number(savedTime) > EXPIRY_MS) {
      deviceId = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
      localStorage.setItem(DEVICE_ID_KEY + '-time', String(Date.now()));
    }

    return deviceId;
  },

  /** Lấy tên thiết bị */
  getDeviceName() {
    let deviceName = localStorage.getItem(DEVICE_NAME_KEY);
    if (!deviceName) {
      deviceName = getDeviceName();
      localStorage.setItem(DEVICE_NAME_KEY, deviceName);
    }
    return deviceName;
  },
};