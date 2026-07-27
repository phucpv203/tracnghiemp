/**
 * DashboardPage - Trang chủ hiển thị danh sách môn học
 * 
 * Hỗ trợ 2 trạng thái:
 * - Đã đăng nhập: hiển thị đầy đủ chức năng
 * - Chưa đăng nhập: hiển thị danh sách môn học dạng chỉ xem
 */
import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';
import { Button, Card, Skeleton, Toast, EmptyState } from '../components/ui';
import { 
  Heart, HeartBreak, MagnifyingGlass, X, Lock, LockOpen, 
  Eye, SignIn, UserPlus, SignOut, Coin, Plus, 
  PushPin, PencilSimple, BookOpen, Exam, Star, 
  WarningCircle, ChalkboardTeacher, ArrowRight
} from '@phosphor-icons/react';

export default function DashboardPage() {
  const { user, onLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unlockingCourseId, setUnlockingCourseId] = useState(null);
  const [unlockingLoading, setUnlockingLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [note, setNote] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showVerifyBanner, setShowVerifyBanner] = useState(true);

  const isAuthenticated = !!user;
  const emailUnverified = isAuthenticated && !user?.emailVerified;

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const coursesData = await apiService.getCourses();
        setCourses(coursesData.items || []);
        
        if (isAuthenticated) {
          const [progressData, favData] = await Promise.all([
            apiService.getProgress(),
            apiService.getFavorites().catch(() => ({ favoriteIds: [] }))
          ]);
          setProgress(progressData.progress || []);
          setUserPoints(progressData.points || 0);
          setFavoriteIds(new Set(favData.favoriteIds || []));
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [isAuthenticated]);

  useEffect(() => {
    const loadNote = async () => {
      try {
        const res = await apiService.getNote('dashboard');
        if (res?.note) {
          setNote(res.note.content || '');
        }
      } catch (error) {
        console.error('Failed to load note:', error);
      }
    };
    loadNote();
  }, []);

  const progressMap = useMemo(() => {
    const map = new Map();
    progress.forEach(p => {
      map.set(Number(p.courseId), p);
    });
    return map;
  }, [progress]);

  const activeCourses = useMemo(() => {
    const processed = courses.map(course => {
      const userProgress = progressMap.get(Number(course.id));
      const isUnlocked = !!userProgress;
      const requiredPoints = Number(course.required_points) || 0;
      const isFavorite = favoriteIds.has(Number(course.id));
      
      return {
        id: course.id,
        title: course.title,
        description: course.description || '',
        unlocked: isUnlocked,
        requiredPoints,
        isFavorite,
        questionType: course.question_type || 'choice'
      };
    });

    return processed.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return a.title.localeCompare(b.title, 'vi');
    });
  }, [courses, progressMap, favoriteIds]);

  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return activeCourses;
    const keyword = searchTerm.trim().toLowerCase();
    return activeCourses.filter(course =>
      course.title.toLowerCase().includes(keyword)
    );
  }, [activeCourses, searchTerm]);

  const handleToggleFavorite = async (courseId, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) return;
    
    const newFavorites = new Set(favoriteIds);
    const wasFavorite = newFavorites.has(Number(courseId));
    if (wasFavorite) newFavorites.delete(Number(courseId));
    else newFavorites.add(Number(courseId));
    setFavoriteIds(newFavorites);

    try {
      const result = await apiService.toggleFavorite(courseId);
      showToast(result.favorite ? 'Đã thêm vào yêu thích!' : 'Đã bỏ yêu thích.', 'success');
    } catch (error) {
      setFavoriteIds(favoriteIds);
      showToast('Không thể cập nhật yêu thích.', 'error');
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await apiService.updateNote('dashboard', noteDraft);
      if (res?.note) setNote(res.note.content || '');
      setEditingNote(false);
      showToast('Đã lưu lưu ý!', 'success');
    } catch (error) {
      showToast(error.message || 'Lỗi khi lưu lưu ý.', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const handleUnlock = async (courseId) => {
    setUnlockingLoading(true);
    try {
      const userId = user?.id;
      if (!userId) throw new Error('Chưa có thông tin user.');
      const result = await apiService.unlockCourse(userId, courseId);
      if (result.success) {
        setUserPoints(result.remainingPoints);
        setProgress((prev) => [...prev, { courseId, userId, status: 'learning', score: 0 }]);
        showToast(result.message || 'Mở khóa thành công!', 'success');
      }
    } catch (error) {
      showToast(error.message || 'Không thể mở khóa môn học.', 'error');
    } finally {
      setUnlockingLoading(false);
      setUnlockingCourseId(null);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton variant="card" />
          <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
            <Skeleton variant="card" count={4} />
          </div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Banner xác thực email */}
      {emailUnverified && showVerifyBanner && (
        <div className="mb-6 rounded-3xl border border-warning-200 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/30 p-5 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <WarningCircle size={24} weight="fill" className="text-warning-600 dark:text-warning-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-warning-800 dark:text-warning-200">
                Email chưa được xác thực
              </h3>
              <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">
                Vui lòng xác thực email để đảm bảo tài khoản được bảo mật.
              </p>
              <p className="mt-2 text-xs text-warning-600 dark:text-warning-400">
                Nếu đã thử mà không nhận được mã OTP,{' '}
                <Link to="/lien-he" className="font-semibold underline hover:text-warning-800 dark:hover:text-warning-200">
                  liên hệ hỗ trợ
                </Link>.
              </p>
              <div className="mt-3 flex gap-3">
                <Button
                  size="sm"
                  variant="warning"
                  onClick={() => navigate('/verify-email', { state: { email: user?.email } })}
                >
                  Xác thực ngay
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowVerifyBanner(false)}
                >
                  Để sau
                </Button>
              </div>
            </div>
            <button
              onClick={() => setShowVerifyBanner(false)}
              className="flex-shrink-0 p-1 text-warning-500 hover:text-warning-700 dark:hover:text-warning-300 transition"
              aria-label="Đóng"
            >
              <X size={20} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Card padding="md" className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isAuthenticated ? (
              <>
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Xin chào, {user?.name || user?.email}</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Chọn môn học để ôn tập hoặc thi thử.</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Hệ thống ôn thi trắc nghiệm</h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Đăng nhập để bắt đầu ôn tập và thi thử các môn học.</p>
              </>
            )}
            
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin" className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition">
                <ChalkboardTeacher size={16} weight="fill" />
                Mở trang quản trị Admin
              </Link>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="rounded-2xl bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-700 px-5 py-3 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-warning-600 dark:text-warning-400">Điểm của bạn</p>
                  <p className="text-2xl font-bold text-warning-700 dark:text-warning-300">{userPoints}</p>
                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => navigate('/topup')}
                    className="mt-2 w-full"
                  >
                    <Plus size={14} weight="bold" />
                    Nạp thêm điểm
                  </Button>
                </div>
                <Button variant="primary" onClick={onLogout}>
                  <SignOut size={16} weight="bold" />
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="secondary">
                    <SignIn size={16} weight="bold" />
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary">
                    <UserPlus size={16} weight="bold" />
                    Đăng ký
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Note section */}
      {note || isAuthenticated ? (
        <div className="mb-6">
          {editingNote ? (
            <div className="rounded-3xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-warning-600 dark:text-warning-400 mb-2 flex items-center gap-1">
                    <PushPin size={14} weight="fill" />
                    Lưu ý
                  </p>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-warning-300 dark:border-warning-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-warning-300 dark:focus:ring-warning-600 resize-none"
                    placeholder="Nhập nội dung lưu ý..."
                  />
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button size="sm" variant="warning" onClick={handleSaveNote} loading={savingNote}>
                    Lưu
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => { setNoteDraft(note); setEditingNote(false); }}>
                    Hủy
                  </Button>
                </div>
              </div>
            </div>
          ) : note ? (
            <div className="group relative rounded-3xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 p-4">
              <div className="flex items-start gap-3">
                <PushPin size={20} weight="fill" className="flex-shrink-0 mt-0.5 text-warning-600 dark:text-warning-400" />
                <p className="flex-1 text-sm text-warning-800 dark:text-warning-200 whitespace-pre-wrap">{note}</p>
                {isAuthenticated && user?.role === 'admin' && (
                  <button
                    onClick={() => { setNoteDraft(note); setEditingNote(true); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded-xl bg-warning-100 dark:bg-warning-800/50 px-3 py-1.5 text-xs font-semibold text-warning-700 dark:text-warning-300 hover:bg-warning-200 dark:hover:bg-warning-700/50"
                    title="Sửa lưu ý"
                  >
                    <PencilSimple size={14} weight="bold" />
                    Sửa
                  </button>
                )}
              </div>
            </div>
          ) : isAuthenticated && user?.role === 'admin' && (
            <button
              onClick={() => { setNoteDraft(note); setEditingNote(true); }}
              className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-600 p-4 w-full text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <Plus size={16} weight="bold" className="inline mr-1" />
              Thêm lưu ý
            </button>
          )}

          <Link
            to="/lien-he"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition"
          >
            Liên hệ hỗ trợ
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      ) : null}

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-3 pl-10 pr-10 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 transition"
          />
          <MagnifyingGlass size={20} weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              aria-label="Xoá tìm kiếm"
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={searchTerm.trim() ? `Không tìm thấy môn học "${searchTerm}"` : 'Chưa có khóa học nào'}
          description={searchTerm.trim() ? 'Thử tìm kiếm với từ khóa khác.' : 'Vui lòng liên hệ admin để được cấp khóa học.'}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.map((course) => (
            <Card key={course.id} padding="md" hover>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h2>
                  {course.description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{course.description}</p>
                  )}
                </div>
                {isAuthenticated && (
                  <button
                    onClick={(e) => handleToggleFavorite(course.id, e)}
                    className="ml-3 flex-shrink-0 p-1.5 rounded-full transition-colors duration-150 hover:bg-danger-50 dark:hover:bg-danger-900/20 focus:outline-none"
                    title={course.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                  >
                    {course.isFavorite ? (
                      <Heart size={24} weight="fill" className="text-danger-500" />
                    ) : (
                      <Heart size={24} weight="regular" className="text-slate-400 dark:text-slate-500 hover:text-danger-400 dark:hover:text-danger-400" />
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {course.unlocked && isAuthenticated ? (
                  <div className="flex gap-3">
                    {course.questionType === 'fill' ? (
                      <>
                        <Button size="sm" variant="primary" onClick={() => navigate(`/fill-study/${course.id}`)}>
                          <BookOpen size={14} weight="bold" />
                          Ôn tập
                        </Button>
                        <Button size="sm" variant="success" onClick={() => navigate(`/fill-exam/${course.id}`)}>
                          <Exam size={14} weight="bold" />
                          Thi thử
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="primary" onClick={() => navigate(`/study/${course.id}`)}>
                          <BookOpen size={14} weight="bold" />
                          Ôn tập
                        </Button>
                        <Button size="sm" variant="success" onClick={() => navigate(`/exam/${course.id}`)}>
                          <Exam size={14} weight="bold" />
                          Thi thử
                        </Button>
                      </>
                    )}
                  </div>
                ) : isAuthenticated ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {unlockingCourseId === course.id ? (
                      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-lg min-w-[240px] relative z-50">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          Mở khóa "{course.title}" với <span className="text-warning-600">{course.requiredPoints} điểm</span>?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => handleUnlock(course.id)}
                            loading={unlockingLoading}
                            disabled={userPoints < course.requiredPoints}
                            className="flex-1"
                          >
                            Mở khóa
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setUnlockingCourseId(null)}
                            className="flex-1"
                          >
                            Hủy
                          </Button>
                        </div>
                        {userPoints < course.requiredPoints && (
                          <p className="mt-2 text-xs text-danger-500">Không đủ điểm (cần {course.requiredPoints})</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setUnlockingCourseId(course.id)}
                          onMouseEnter={(e) => { e.currentTarget.textContent = `Mở khóa (${course.requiredPoints}đ)`; }}
                          onMouseLeave={(e) => { e.currentTarget.textContent = `🔒 ${course.requiredPoints} điểm`; }}
                          className="rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-warning-50 dark:hover:bg-warning-900/30 hover:text-warning-700 dark:hover:text-warning-400 hover:border-warning-300 dark:hover:border-warning-600 transition"
                        >
                          <Lock size={14} weight="bold" className="inline mr-1" />
                          {course.requiredPoints} điểm
                        </button>
                        <Button size="sm" variant="secondary" onClick={() => navigate(`/preview/${course.id}`)}>
                          <Eye size={14} weight="bold" />
                          Dùng thử
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/preview/${course.id}`)}>
                    <Eye size={14} weight="bold" />
                    Dùng thử
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Overlay khi đang mở khóa */}
      {isAuthenticated && unlockingCourseId !== null && (
        <div className="fixed inset-0 bg-black/20 z-40 animate-fade-in" onClick={() => !unlockingLoading && setUnlockingCourseId(null)}></div>
      )}

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