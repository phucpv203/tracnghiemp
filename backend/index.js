import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import examRoutes from './routes/exams.js';
import progressRoutes from './routes/progress.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Danh sách origin được phép gọi API
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  // GitHub Pages: https://<user>.github.io  hoặc  https://<user>.github.io/<repo>
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có origin (curl, server-to-server) hoặc nằm trong whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
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

app.get('/', (req, res) =>
  res.json({ message: 'Quiz API Gateway is running', env: process.env.NODE_ENV || 'development' })
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend is running on port ${PORT}`);
});
