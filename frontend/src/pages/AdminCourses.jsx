import { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';
import { Button, Card, Input, Toast } from '../components/ui';
import { 
  ArrowLeft, SignOut, Plus, Trash, FloppyDisk, 
  PencilSimple, FileArrowDown, MagnifyingGlass, 
  Lock, BookOpen, CheckCircle, WarningCircle 
} from '@phosphor-icons/react';

export default function AdminCourses() {
  const { onLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCourse, setNewCourse] = useState({ title: '', description: '', requiredScore: 20, questionType: 'choice' });
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
    setNewCourse({ title: '', description: '', requiredScore: 20, questionType: 'choice' });
    setToast({ message: 'Đã tạo môn học mới!', type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const update = async (id) => {
    const title = document.getElementById(`title-${id}`).value;
    const description = document.getElementById(`description-${id}`).value;
    const requiredScore = Number(document.getElementById(`required-${id}`).value);
    const questionType = document.getElementById(`qtype-${id}`).value;
    const res = await apiService.updateCourse(id, { title, description, requiredScore, questionType });
    setCourses((s) => s.map((c) => (c.id === id ? res.course : c)));
    setToast({ message: 'Đã cập nhật môn học!', type: 'success' });
    setTimeout(() => setToast(null), 3000);
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
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Quản lý môn học & câu hỏi</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Thêm, sửa, xoá môn học và câu hỏi.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/trang-chu">
              <Button variant="secondary" size="sm">
                <ArrowLeft size={16} weight="bold" />
                Quay lại
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={onLogout}>
              <SignOut size={16} weight="bold" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-6 space-y-4">
        {/* Thêm môn học mới */}
        <Card padding="md">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plus size={18} weight="bold" className="text-success-600" />
            Thêm môn học mới
          </h3>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
              placeholder="Tiêu đề môn học"
              value={newCourse.title}
              onChange={(e) => setNewCourse((s) => ({ ...s, title: e.target.value }))}
            />
            <textarea
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 resize-none"
              placeholder="Mô tả môn học"
              rows="2"
              value={newCourse.description}
              onChange={(e) => setNewCourse((s) => ({ ...s, description: e.target.value }))}
            />
            <div className="flex gap-3">
              <input
                type="number"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                placeholder="Điểm mở khóa"
                value={newCourse.requiredScore}
                onChange={(e) => setNewCourse((s) => ({ ...s, requiredScore: Number(e.target.value) }))}
              />
              <select
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                value={newCourse.questionType}
                onChange={(e) => setNewCourse((s) => ({ ...s, questionType: e.target.value }))}
              >
                <option value="choice">Trắc nghiệm (chọn đáp án)</option>
                <option value="fill">Điền đáp án (xem hình)</option>
              </select>
            </div>
            <Button variant="success" onClick={create}>
              <Plus size={16} weight="bold" />
              Tạo môn học
            </Button>
          </div>
        </Card>

        {/* Import câu hỏi */}
        <Card padding="md">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileArrowDown size={18} weight="bold" className="text-primary-600" />
            Import câu hỏi từ file JSON
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            File JSON có thể là một object hoặc mảng object với các trường: question, answers, correct, explanation.
          </p>
          <div className="mt-4 space-y-3">
            <select
              value={uploadCourseId}
              onChange={(e) => setUploadCourseId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
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
              className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-900/30 file:text-primary-700 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <Button variant="primary" onClick={importQuestions}>
              <FileArrowDown size={16} weight="bold" />
              Import câu hỏi
            </Button>
            {importMessage && (
              <p className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <CheckCircle size={16} weight="fill" className="text-success-600" />
                {importMessage}
              </p>
            )}
          </div>
        </Card>

        {/* Search bar */}
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm môn học theo tên..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
          />
          <MagnifyingGlass size={18} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Danh sách môn học */}
        {courses.map((c) => (
          <Card key={c.id} padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{c.title}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 dark:bg-warning-900/40 px-3 py-1 text-xs font-semibold text-warning-700 dark:text-warning-400">
                  <Lock size={12} weight="bold" />
                  {c.required_points || 0} điểm
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  c.question_type === 'fill'
                    ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400'
                    : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400'
                }`}>
                  <BookOpen size={12} weight="bold" />
                  {c.question_type === 'fill' ? 'Điền đáp án' : 'Trắc nghiệm'}
                </span>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDeleteCourse(c.id, c.title)}
                loading={deletingCourseId === c.id}
              >
                <Trash size={14} weight="bold" />
                Xoá
              </Button>
            </div>
            
            <div className="space-y-3">
              <input
                id={`title-${c.id}`}
                defaultValue={c.title}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                placeholder="Tiêu đề"
              />
              <textarea
                id={`description-${c.id}`}
                defaultValue={c.description || ''}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 resize-none"
                placeholder="Mô tả môn học"
                rows="2"
              />
              <div className="flex gap-3">
                <input
                  id={`required-${c.id}`}
                  type="number"
                  defaultValue={c.required_points || 0}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                  placeholder="Điểm mở khóa"
                />
                <select
                  id={`qtype-${c.id}`}
                  defaultValue={c.question_type || 'choice'}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800"
                >
                  <option value="choice">Trắc nghiệm</option>
                  <option value="fill">Điền đáp án</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => update(c.id)}>
                  <FloppyDisk size={14} weight="bold" />
                  Lưu
                </Button>
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => navigate(`/admin/courses/${c.id}/questions`)}
                >
                  <PencilSimple size={14} weight="bold" />
                  Sửa câu hỏi
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </main>
  );
}