import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

const PAGE_LABELS = {
  dashboard: 'Trang chủ (Dashboard)',
  login: 'Trang đăng nhập',
  register: 'Trang đăng ký',
};

export default function AdminNote() {
  const { onLogout } = useContext(AuthContext);
  const [notes, setNotes] = useState({ dashboard: '', login: '', register: '' });
  const [drafts, setDrafts] = useState({ dashboard: '', login: '', register: '' });
  const [saving, setSaving] = useState(null); // page đang lưu
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadNotes = async () => {
      try {
        const res = await apiService.getAllNotes();
        if (res?.notes) {
          setNotes(res.notes);
          setDrafts({ ...res.notes });
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadNotes();
  }, []);

  const handleSave = async (page) => {
    setSaving(page);
    try {
      const res = await apiService.updateNote(page, drafts[page]);
      if (res?.note) {
        setNotes((prev) => ({ ...prev, [page]: res.note.content || '' }));
      }
      showToast(`Đã lưu lưu ý "${PAGE_LABELS[page]}"!`, 'success');
    } catch (error) {
      showToast(error.message || 'Lỗi khi lưu lưu ý.', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (page) => {
    setDrafts((prev) => ({ ...prev, [page]: notes[page] }));
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="text-slate-600 dark:text-slate-400">Đang tải...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Quản lý lưu ý</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Quản lý 3 dòng lưu ý riêng biệt cho từng trang.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="rounded-2xl bg-slate-100 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              ← Quay lại Admin
            </Link>
            <button
              onClick={onLogout}
              className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {['dashboard', 'login', 'register'].map((page) => (
          <div key={page} className="rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
              📌 Lưu ý - {PAGE_LABELS[page]}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Lưu ý này sẽ hiển thị ở đầu {PAGE_LABELS[page].toLowerCase()}.
            </p>

            <div className="space-y-4">
              <textarea
                value={drafts[page]}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [page]: e.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-600 resize-none"
                placeholder={`Nhập nội dung lưu ý cho ${PAGE_LABELS[page].toLowerCase()}...`}
              />

              {/* Preview */}
              {drafts[page] && (
                <div className="rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">📌</span>
                    <p className="flex-1 text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{drafts[page]}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSave(page)}
                  disabled={saving === page}
                  className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-600"
                >
                  {saving === page ? 'Đang lưu...' : 'Lưu lưu ý'}
                </button>
                <button
                  onClick={() => handleReset(page)}
                  disabled={drafts[page] === notes[page]}
                  className="rounded-2xl border border-slate-200 dark:border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Khôi phục
                </button>
              </div>
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