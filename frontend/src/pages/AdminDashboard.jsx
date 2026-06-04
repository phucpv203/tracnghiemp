import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Quản lý người dùng và nội dung.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/admin/users" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md">
          <h2 className="text-lg font-semibold">Quản lý tài khoản</h2>
          <p className="mt-2 text-sm text-slate-600">Chỉnh sửa, thay đổi role và xóa (demo).</p>
        </Link>

        <Link to="/admin/courses" className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md">
          <h2 className="text-lg font-semibold">Quản lý môn học & câu hỏi</h2>
          <p className="mt-2 text-sm text-slate-600">Thêm/Chỉnh sửa môn học, thêm câu hỏi.</p>
        </Link>
      </div>
    </main>
  );
}
