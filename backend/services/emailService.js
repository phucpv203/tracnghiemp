/**
 * Email Service - Gửi email sử dụng Resend API
 * 
 * Cần biến môi trường:
 *   RESEND_API_KEY - API key từ resend.com
 *   EMAIL_FROM - Địa chỉ email người gửi (VD: noreply@yourdomain.com)
 */
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@tracnghiemyh.cloud';

if (!RESEND_API_KEY) {
  console.warn('[email] ⚠️ RESEND_API_KEY chưa được set. Email sẽ không được gửi thực tế.');
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Gửi email OTP xác thực
 */
export async function sendVerificationEmail(email, otp, name) {
  if (!resend) {
    console.log(`[email] Mock: Gửi OTP ${otp} đến ${email}`);
    return { id: 'mock' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Hệ thống ôn thi <${EMAIL_FROM}>`,
      to: email,
      subject: 'Xác thực email đăng ký tài khoản',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Xác thực email</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">Xin chào ${name || email},</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Cảm ơn bạn đã đăng ký tài khoản. Vui lòng nhập mã OTP dưới đây để xác thực email của bạn:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <div style="background: #ffffff; border-radius: 12px; padding: 20px 32px; display: inline-block; border: 2px dashed #94a3b8;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otp}</span>
              </div>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
              Mã OTP có hiệu lực trong <strong>5 phút</strong>. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #94a3b8; font-size: 12px;">Hệ thống ôn thi trắc nghiệm</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[email] Send error:', error);
      throw new Error('Không thể gửi email xác thực.');
    }

    console.log('[email] Sent verification email:', data?.id);
    return data;
  } catch (error) {
    console.error('[email] Send verification email error:', error);
    throw error;
  }
}

/**
 * Gửi email OTP xác nhận đổi thiết bị
 */
export async function sendDeviceChangeOtpEmail(email, otp, name, currentDeviceName) {
  if (!resend) {
    console.log(`[email] Mock: Gửi device-change OTP ${otp} đến ${email}`);
    return { id: 'mock' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Hệ thống ôn thi <${EMAIL_FROM}>`,
      to: email,
      subject: 'Xác nhận đổi thiết bị đăng nhập',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Xác nhận đổi thiết bị</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">Xin chào ${name || email},</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Tài khoản của bạn hiện đang được đăng nhập trên <strong>"${currentDeviceName}"</strong>.
              Có người đang yêu cầu đăng nhập vào tài khoản của bạn từ thiết bị khác.
            </p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Nếu đó là bạn, vui lòng nhập mã OTP dưới đây để xác nhận đổi thiết bị:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <div style="background: #ffffff; border-radius: 12px; padding: 20px 32px; display: inline-block; border: 2px dashed #94a3b8;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otp}</span>
              </div>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
              Mã OTP có hiệu lực trong <strong>5 phút</strong>. Lưu ý: bạn chỉ được đổi thiết bị <strong>1 lần mỗi tuần</strong>.
            </p>
            <p style="color: #ef4444; font-size: 13px; line-height: 1.5; margin-top: 12px;">
              ⚠️ Nếu bạn không yêu cầu đổi thiết bị, vui lòng đổi mật khẩu ngay để bảo vệ tài khoản.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #94a3b8; font-size: 12px;">Hệ thống ôn thi trắc nghiệm</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[email] Send error:', error);
      throw new Error('Không thể gửi email xác nhận đổi thiết bị.');
    }

    console.log('[email] Sent device change OTP email:', data?.id);
    return data;
  } catch (error) {
    console.error('[email] Send device change OTP email error:', error);
    throw error;
  }
}

/**
 * Gửi email reset mật khẩu
 */
export async function sendPasswordResetEmail(email, otp, name) {
  if (!resend) {
    console.log(`[email] Mock: Gửi reset OTP ${otp} đến ${email}`);
    return { id: 'mock' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Hệ thống ôn thi <${EMAIL_FROM}>`,
      to: email,
      subject: 'Đặt lại mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e293b; font-size: 24px; margin: 0;">Đặt lại mật khẩu</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">Xin chào ${name || email},</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhập mã OTP dưới đây để tiếp tục:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <div style="background: #ffffff; border-radius: 12px; padding: 20px 32px; display: inline-block; border: 2px dashed #94a3b8;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${otp}</span>
              </div>
            </div>
            
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
              Mã OTP có hiệu lực trong <strong>5 phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #94a3b8; font-size: 12px;">Hệ thống ôn thi trắc nghiệm</p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('[email] Send error:', error);
      throw new Error('Không thể gửi email đặt lại mật khẩu.');
    }

    console.log('[email] Sent password reset email:', data?.id);
    return data;
  } catch (error) {
    console.error('[email] Send password reset email error:', error);
    throw error;
  }
}