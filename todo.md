# Todo List

## Backend
- [x] Tạo migration SQL thêm cột question_type vào bảng courses
- [x] Cập nhật adminService.js - courses trả về question_type, hỗ trợ CRUD
- [x] Cập nhật exams.js submit endpoint - hỗ trợ chấm bài kiểu fill (so sánh text)

## Frontend - New Pages
- [x] Tạo FillStudyPage.jsx - Ôn tập kiểu điền đáp án (input + hình ảnh)
- [x] Tạo FillExamPage.jsx - Thi thử kiểu điền đáp án

## Frontend - Cập nhật
- [x] Cập nhật App.jsx - thêm routes mới (fill-study, fill-exam)
- [x] Cập nhật DashboardPage.jsx - phân biệt route dựa vào question_type
- [x] Cập nhật AdminCourses.jsx - cho phép chọn question_type khi tạo/sửa khóa học
- [ ] (Không cần) AdminEditQuestions.jsx - câu hỏi kiểu fill vẫn dùng chung giao diện edit hiện tại
