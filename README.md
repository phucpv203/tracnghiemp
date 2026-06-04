# Web Ôn Thi Trắc Nghiệm

Dự án này là một thiết kế mẫu cho hệ thống ôn thi trắc nghiệm với:

- Frontend React + Tailwind CSS
- Backend API Gateway + Auth Service + Exam Service + Progression Service
- Database schema cho User, Course, Question, Exam và UserProgress
- Data flow: User -> Frontend -> Backend -> Database -> Frontend

## Cấu trúc

- `frontend/`: ứng dụng React với Tailwind, gồm các trang `Login`, `Register`, `Dashboard`, `Study`, `Exam`.
- `backend/`: API server Node.js/Express với các route Auth, Courses, Exams, Progress.
- `backend/db/schema.sql`: định nghĩa bảng SQL cho PostgreSQL/MySQL.

## Hướng dẫn nhanh

1. `cd frontend && npm install`
2. `npm run dev`
3. `cd ../backend && npm install`
4. `npm start`

## Kiến trúc dịch vụ

- `Auth Service`: xử lý đăng nhập/đăng ký, JWT
- `Exam Service`: cung cấp câu hỏi, sinh đề, chấm điểm
- `Progression Service`: lưu điểm, trạng thái khóa/mở khóa môn học
- `API Gateway`: gom các route và kiểm duyệt truy cập
