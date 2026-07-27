import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';
import { Button, Card, Toast } from '../components/ui';
import { ArrowLeft, SignOut, PushPin, FloppyDisk, ArrowClockwise, WarningCircle } from '@phosphor-icons/react';

const PAGE_LABELS = {
  dashboard: 'Trang chủ (Dashboard)',
  login: 'Trang đăng nhập',
  register: 'Trang đăng ký',
};

export default function AdminNote() {
  const { onLogout } = useContext(AuthContext);
  const [notes, setNotes] = useState({ dashboard: '', login: '', register: '' });
  const [drafts, setDrafts] = useState({ dashboard: '', login: '', register: '' });
  const [saving, setSaving] = useState(null);
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
          <p className="text-slate-600 dark:text-slate-400">Đang tải...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Quản lý lưu ý</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Quản lý 3 dòng lưu ý riêng biệt cho từng trang.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin"><Button variant="secondary" size="sm"><ArrowLeft size={16} weight="bold" /> Quay lại Admin</Button></Link>
            <Button variant="primary" size="sm" onClick={onLogout}><SignOut size={16} weight="bold" /> Đăng xuất</Button>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {['dashboard', 'login', 'register'].map((page) => (
          <Card key={page} padding="md">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-2">
              <PushPin size={18} weight="fill" className="text-warning-600" />
              Lưu ý - {PAGE_LABELS[page]}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Lưu ý này sẽ hiển thị ở đầu {PAGE_LABELS[page].toLowerCase()}.
            </p>

            <div className="space-y-4">
              <textarea
                value={drafts[page]}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [page]: e.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 resize-none"
                placeholder={`Nhập nội dung lưu ý cho ${PAGE_LABELS[page].toLowerCase()}...`}
              />

              {drafts[page] && (
                <div className="rounded-3xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 p-4">
                  <div className="flex items-start gap-3">
                    <PushPin size={20} weight="fill" className="flex-shrink-0 mt-0.5 text-warning-600 dark:text-warning-400" />
                    <p className="flex-1 text-sm text-warning-800 dark:text-warning-200 whitespace-pre-wrap">{drafts[page]}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Button size="sm" variant="primary" onClick={() => handleSave(page)} loading={saving === page}>
                  <FloppyDisk size={14} weight="bold" /> Lưu lưu ý
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleReset(page)} disabled={drafts[page] === notes[page]}>
                  <ArrowClockwise size={14} weight="bold" /> Khôi phục
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </main>
  );
}