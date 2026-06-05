import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import examRoutes from './routes/exams.js';
import progressRoutes from './routes/progress.js';
import adminRoutes from './routes/admin.js';
import payosRoutes from './routes/payos.js';

const app = express();

// Danh sách origin được phép gọi API.
// QUAN TRỌNG: Origin = protocol + host + port, KHÔNG bao gồm path.
//   VD đúng:    https://phucpv203.github.io
//   VD sai:     https://phucpv203.github.io/tracnghiemp/
//   VD sai:     https://phucpv203.github.io/    (có trailing slash)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://phucpv203.github.io',      // GitHub Pages cũ
  'https://tracnghiemyh.cloud',       // Custom domain mới
  process.env.FRONTEND_URL,           // Set trên Render
].filter(Boolean);

console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (curl, server-to-server) hoặc nằm trong whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`[CORS] Blocked request from origin: "${origin}"`);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use('/exams', examRoutes);
app.use('/progress', progressRoutes);
app.use('/admin', adminRoutes);
app.use('/payos', payosRoutes);

app.get('/', (req, res) =>
  res.json({ message: 'Quiz API Gateway is running', env: process.env.NODE_ENV || 'development' })
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend is running on port ${PORT}`);
});
