import { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

export default function AdminEditQuestions() {
  const { courseId } = useParams();
  const { onLogout } = useContext(AuthContext);
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null); // question id being edited
  const [editForm, setEditForm] = useState({ content: '', answers: [], correct: 0 });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchQuestions = async () => {
    try {
      // Fetch course detail (includes questions with answers)
      const res = await apiService.getCourseDetail(courseId);
      setCourse(res.course);
      setQuestions(res.course.questions || []);
    } catch (err) {
      showToast('Không thể tải câu hỏi: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [courseId]);

  // Filter questions by search term
  const filteredQuestions = questions.filter((q) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return q.content.toLowerCase().includes(term);
  });

  const handleEditClick = (q) => {
    if (expandedId === q.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(q.id);
    setEditForm({
      content: q.content,
      answers: q.answers.map((a) => a.answer_text),
      correct: q.answers.findIndex((a) => a.is_correct),
    });
  };

  const handleAnswerChange = (index, value) => {
    setEditForm((prev) => {
      const answers = [...prev.answers];
      answers[index] = value;
      return { ...prev, answers };
    });
  };

  const handleAddAnswer = () => {
    setEditForm((prev) => ({
      ...prev,
      answers: [...prev.answers, ''],
    }));
  };

  const handleRemoveAnswer = (index) => {
    setEditForm((prev) => {
      const answers = prev.answers.filter((_, i) => i !== index);
      let correct = prev.correct;
      if (prev.correct === index) correct = 0;
      else if (prev.correct > index) correct = prev.correct - 1;
      return { ...prev, answers, correct };
    });
  };

  const handleSave = async () => {
    if (!editForm.content.trim()) {
      showToast('Nội dung câu hỏi không được để trống.', 'error');
      return;
    }
    if (editForm.answers.length < 2) {
      showToast('Cần ít nhất 2 câu trả lời.', 'error');
      return;
    }
    if (editForm.answers.some((a) => !a.trim())) {
      showToast('Câu trả lời không được để trống.', 'error');
      return;
    }
    if (editForm.correct < 0 || editForm.correct >= editForm.answers.length) {
      showToast('Vui lòng chọn đáp án đúng hợp lệ.', 'error');
      return;
    }

    setSaving(true);
    try {
      await apiService.updateQuestion(expandedId, {
        content: editForm.content,
        answers: editForm.answers,
        correct: editForm.correct,
        explanation: '', // keep existing explanation if any
      });
      showToast('Đã cập nhật câu hỏi thành công.', 'success');
      setExpandedId(null);
      fetchQuestions(); // refresh
    } catch (err) {
      showToast('Lỗi khi cập nhật: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {course ? `Chỉnh sửa câu hỏi: ${course.title}` : 'Đang tải...'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Danh sách câu hỏi - Bấm "Sửa" để chỉnh sửa nội dung và đáp án.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/courses"
            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            ← Quay lại Môn học
          </Link>
          <button
            onClick={onLogout}
            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm câu hỏi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      {/* Questions count */}
      <div className="mb-4 text-sm text-slate-500">
        {filteredQuestions.length} / {questions.length} câu hỏi
        {searchTerm.trim() && ` (kết quả tìm kiếm cho "${searchTerm}")`}
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-xl bg-white p-5 shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <span className="mr-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                  #{idx + 1}
                </span>
                <span className="text-slate-800">{q.content}</span>
              </div>
              <button
                onClick={() => handleEditClick(q)}
                className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  expandedId === q.id
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {expandedId === q.id ? 'Đóng' : 'Sửa'}
              </button>
            </div>

            {/* Expanded edit form */}
            {expandedId === q.id && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Nội dung câu hỏi
                  </label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                  />
                </div>

                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">
                      Câu trả lời
                    </label>
                    <button
                      onClick={handleAddAnswer}
                      className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      + Thêm đáp án
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editForm.answers.map((answer, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={editForm.correct === i}
                          onChange={() =>
                            setEditForm((prev) => ({ ...prev, correct: i }))
                          }
                          className="h-4 w-4 shrink-0 accent-sky-600"
                          title="Đánh dấu là đáp án đúng"
                        />
                        <input
                          value={answer}
                          onChange={(e) => handleAnswerChange(i, e.target.value)}
                          placeholder={`Đáp án ${i + 1}`}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                        />
                        <button
                          onClick={() => handleRemoveAnswer(i)}
                          className="shrink-0 rounded-md bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:bg-slate-200"
                          disabled={editForm.answers.length <= 2}
                          title={
                            editForm.answers.length <= 2
                              ? 'Cần ít nhất 2 đáp án'
                              : 'Xoá đáp án'
                          }
                        >
                          ✕
                        </button>
                        {editForm.correct === i && (
                          <span className="shrink-0 text-xs font-semibold text-emerald-600">
                            ✅ Đúng
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setExpandedId(null)}
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-md bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:bg-sky-400"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            {searchTerm.trim()
              ? 'Không tìm thấy câu hỏi phù hợp.'
              : 'Chưa có câu hỏi nào cho môn học này.'}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-2xl px-6 py-4 shadow-lg text-sm font-semibold transition-all ${
            toast.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}