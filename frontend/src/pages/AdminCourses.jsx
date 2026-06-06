import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

export default function AdminCourses() {
  const { onLogout } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCourse, setNewCourse] = useState({ title: '', requiredScore: 0 });
  const [uploadCourseId, setUploadCourseId] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [importMessage, setImportMessage] = useState('');
  const [deletingCourseId, setDeletingCourseId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchCourses = (search) => {
    apiService.getAdminCourses(search || undefined).then((res) => setCourses(res.courses || []));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchCourses(value);
  };

  const create = async () => {
    const res = await apiService.createCourse(newCourse);
    setCourses((s) => [...s, res.course]);
    setNewCourse({ title: '', requiredScore: 0 });
  };

  const update = async (id) => {
    const title = document.getElementById(`title-${id}`).value;
    const requiredScore = Number(document.getElementById(`required-${id}`).value);
    const res = await apiService.updateCourse(id, { title, requiredScore });
    setCourses((s) => s.map((c) => (c.id === id ? res.course : c)));
  };

  const importQuestions = async () => {
    if (!uploadCourseId || !uploadFile) {
      setImportMessage('Vui lòng chọn môn và file JSON.');
      return;
    }

    try {
      const text = await uploadFile.text();
      const parsed = JSON.parse(text);
      const questions = Array.isArray(parsed) ? parsed : [parsed];
      const res = await apiService.importQuestions(uploadCourseId, questions);
      setImportMessage(`Đã import ${res.imported.length} câu hỏi.`);
      setUploadFile(null);
      document.getElementById('question-file').value = '';
    } catch (error) {
      setImportMessage(`Lỗi import: ${error.message}`);
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá môn học "${courseTitle}"? Hành động này không thể hoàn tác và sẽ xoá tất cả câu hỏi, đề thi liên quan.`)) {
      return;
    }
    setDeletingCourseId(courseId);
    try {
      await apiService.deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setToast({ message: `Đã xoá môn học "${courseTitle}"`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ message: err.message || 'Lỗi khi xoá môn học.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setDeletingCourseId(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý môn học & câu hỏi</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/trang-chu"
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            ← Quay lại Trang chủ
          </Link>
          <button
            onClick={onLogout}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Thêm môn học mới</h3>
          <input className="mt-3 w-full px-3 py-2" placeholder="Tiêu đề" value={newCourse.title} onChange={(e) => setNewCourse((s) => ({ ...s, title: e.target.value }))} />
          <input
            type="number"
            className="mt-3 w-full px-3 py-2"
            placeholder="Điểm mở khóa"
            value={newCourse.requiredScore}
            onChange={(e) => setNewCourse((s) => ({ ...s, requiredScore: Number(e.target.value) }))}
          />
          <button className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-white" onClick={create}>Tạo môn học</button>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Import câu hỏi từ file JSON</h3>
          <p className="mt-2 text-sm text-slate-600">File JSON có thể là một object hoặc mảng object với các trường: question, answers, correct, explanation.</p>
          <select
            value={uploadCourseId}
            onChange={(e) => setUploadCourseId(e.target.value)}
            className="mt-3 w-full px-3 py-2"
          >
            <option value="">Chọn môn</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
          <input
            id="question-file"
            type="file"
            accept="application/json"
            className="mt-3 w-full px-3 py-2"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
          />
          <button className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-white" onClick={importQuestions}>Import câu hỏi</button>
          {importMessage && <p className="mt-3 text-sm text-slate-700">{importMessage}</p>}
        </div>

        {/* Search bar */}
        <div className="mt-2 mb-2">
          <input
            type="text"
            placeholder="Tìm kiếm môn học theo tên..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>

        {courses.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{c.title}</h3>
              <button
                onClick={() => handleDeleteCourse(c.id, c.title)}
                disabled={deletingCourseId === c.id}
                className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300"
              >
                {deletingCourseId === c.id ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
            <input id={`title-${c.id}`} defaultValue={c.title} className="mt-2 w-full px-3 py-2" />
            <input
              id={`required-${c.id}`}
              type="number"
              defaultValue={c.requiredScore || 0}
              className="mt-2 w-full px-3 py-2"
              placeholder="Điểm mở khóa"
            />
            <div className="mt-3 flex gap-2">
              <button onClick={() => update(c.id)} className="rounded-md bg-sky-600 px-3 py-1 text-white">Lưu</button>
            </div>
          </div>
        ))}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 rounded-2xl px-6 py-4 shadow-lg text-sm font-semibold transition-all ${
          toast.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}