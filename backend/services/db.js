import pg from 'pg';

const { Pool } = pg;
const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const pool = new Pool({ connectionString });

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export default pool;
