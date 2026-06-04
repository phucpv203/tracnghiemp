import pg from 'pg';

const { Pool } = pg;

// Ưu tiên đọc DATABASE_URL, fallback về SUPABASE_DB_URL
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error(
    '[DB] ❌ Không tìm thấy DATABASE_URL! ' +
    'Vào Render Dashboard → Service → Environment → thêm biến DATABASE_URL ' +
    '(lấy từ Supabase: Settings → Database → Connection string → Transaction mode, port 6543).'
  );
  // Không throw ở đây để app vẫn start, các request sẽ trả lỗi rõ ràng.
} else {
  // Log an toàn: ẩn password
  const safe = connectionString.replace(/:[^:@]+@/, ':****@');
  console.log('[DB] Connection string:', safe);
}

const pool = new Pool({
  connectionString,
  // Supabase yêu cầu SSL. rejectUnauthorized=false vì cert của Supabase
  // dùng CA self-signed, không có trong store mặc định của Node.
  ssl: connectionString && /supabase|render|heroku|amazonaws/i.test(connectionString)
    ? { rejectUnauthorized: false }
    : false,
  // Giữ connection sống để tránh timeout khi free tier ngủ
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] ❌ Pool error:', err.message);
});

export async function query(text, params) {
  if (!connectionString) {
    throw new Error('DATABASE_URL chưa được set trên Render.');
  }
  return pool.query(text, params);
}

export default pool;
