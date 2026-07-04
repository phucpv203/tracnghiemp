/**
 * DashboardPage - Trang chủ hiển thị danh sách môn học
 * 
 * Hỗ trợ 2 trạng thái:
 * - Đã đăng nhập: hiển thị đầy đủ chức năng (học tập, thi thử, mở khóa, điểm, yêu thích)
 * - Chưa đăng nhập: hiển thị danh sách môn học dạng chỉ xem + nút Đăng nhập/Đăng ký
 */
import { useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

export default function DashboardPage() {
  const { user, onLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // State management
  const [courses, setCourses] = useState([]);        // Danh sách khóa học từ DB
  const [progress, setProgress] = useState([]);      // Tiến độ học tập (chỉ khi đã đăng nhập)
  const [userPoints, setUserPoints] = useState(0);    // Điểm của user (chỉ khi đã đăng nhập)
  const [loading, setLoading] = useState(true);      // Đang tải dữ liệu
  const [unlockingCourseId, setUnlockingCourseId] = useState(null); // Môn đang xác nhận mở khóa
  const [unlockingLoading, setUnlockingLoading] = useState(false);
  const [toast, setToast] = useState(null); // {message, type: 'success'|'error'}
  const [searchTerm, setSearchTerm] = useState('');   // Từ khóa tìm kiếm môn học
  const [favoriteIds, setFavoriteIds] = useState(new Set()); // Set course_id yêu thích
  const [note, setNote] = useState('');                // Dòng lưu ý
  const [editingNote, setEditingNote] = useState(false); // Đang sửa lưu ý
  const [noteDraft, setNoteDraft] = useState('');      // Bản nháp khi sửa
  const [savingNote, setSavingNote] = useState(false); // Đang lưu lưu ý

  const isAuthenticated = !!user;

  // Hiển thị toast
  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Load data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const coursesData = await apiService.getCourses();
        setCourses(coursesData.items || []);
        
        // Chỉ gọi progress khi đã đăng nhập
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

  // Load note từ API
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
  
  // Build map courseId -> progress data for quick lookup
  const progressMap = useMemo(() => {
    const map = new Map();
    progress.forEach(p => {
      map.set(Number(p.courseId), p);
    });
    return map;
  }, [progress]);

  // Process courses with their status and sort: favorites first,
  // then unlocked (A-Z), then locked (A-Z)
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

    // Sắp xếp: yêu thích lên đầu, sau đó mở khóa (A-Z), cuối cùng chưa mở khóa (A-Z)
    return processed.sort((a, b) => {
      // Yêu thích luôn lên đầu
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      // Kế đến là mở khóa
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }
      return a.title.localeCompare(b.title, 'vi');
    });
  }, [courses, progressMap, favoriteIds]);

  // Filter courses based on search term
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return activeCourses;
    const keyword = searchTerm.trim().toLowerCase();
    return activeCourses.filter(course =>
      course.title.toLowerCase().includes(keyword)
    );
  }, [activeCourses, searchTerm]);

  // Toggle yêu thích
  const handleToggleFavorite = async (courseId, e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!isAuthenticated) return;
    
    // Optimistic update
    const newFavorites = new Set(favoriteIds);
    const wasFavorite = newFavorites.has(Number(courseId));
    if (wasFavorite) {
      newFavorites.delete(Number(courseId));
    } else {
      newFavorites.add(Number(courseId));
    }
    setFavoriteIds(newFavorites);

    try {
      const result = await apiService.toggleFavorite(courseId);
      if (result.favorite) {
        showToast('Đã thêm vào yêu thích!', 'success');
      } else {
        showToast('Đã bỏ yêu thích.', 'success');
      }
    } catch (error) {
      // Rollback on error
      setFavoriteIds(favoriteIds);
      showToast('Không thể cập nhật yêu thích.', 'error');
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await apiService.updateNote('dashboard', noteDraft);
      if (res?.note) {
        setNote(res.note.content || '');
      }
      setEditingNote(false);
      showToast('Đã lưu lưu ý!', 'success');
    } catch (error) {
      showToast(error.message || 'Lỗi khi lưu lưu ý.', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const handleCancelEditNote = () => {
    setNoteDraft(note);
    setEditingNote(false);
  };

  const handleStartEditNote = () => {
    setNoteDraft(note);
    setEditingNote(true);
  };

  const handleUnlock = async (courseId) => {
    setUnlockingLoading(true);
    try {
      // Lấy userId từ user context (đã đăng nhập)
      const userId = user?.id;
      if (!userId) {
        throw new Error('Chưa có thông tin user. Vui lòng đăng nhập lại.');
      }
      console.log('[Dashboard] Unlock course:', { userId, courseId });
      const result = await apiService.unlockCourse(userId, courseId);
      if (result.success) {
        // Cập nhật điểm ngay lập tức trên UI
        setUserPoints(result.remainingPoints);
        // Thêm progress mới vào state (không cần gọi lại API)
        setProgress((prev) => [...prev, { courseId, userId, status: 'learning', score: 0 }]);
        // Hiện toast thành công
        showToast(result.message || 'Mở khóa thành công!', 'success');
      }
    } catch (error) {
      console.error('[Dashboard] Unlock error:', error);
      showToast(error.message || 'Không thể mở khóa môn học.', 'error');
    } finally {
      setUnlockingLoading(false);
      setUnlockingCourseId(null);
    }
  };

  if (loading) {
    return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-slate-600 dark:text-slate-400">Đang tải...</div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30 sm:flex-row sm:items-center sm:justify-between">
        <div>
          
          
          {isAuthenticated ? (
            <>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Xin chào, {user?.name || user?.email}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Chọn môn học để ôn tập hoặc thi thử.</p>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">Hệ thống ôn thi trắc nghiệm</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-400">Đăng nhập để bắt đầu ôn tập và thi thử các môn học.</p>
            </>
          )}
          
          {isAuthenticated && user?.role === 'admin' && (
            <Link to="/admin" className="mt-3 inline-flex rounded-full bg-slate-900 dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
              Mở trang quản trị Admin
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-5 py-3 text-center relative">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Điểm của bạn</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{userPoints}</p>
                <button
                  onClick={() => navigate('/topup')}
                  className="mt-2 w-full rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition"
                >
                  + Nạp thêm điểm
                </button>
              </div>
              <button onClick={onLogout} className="self-start rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Dòng lưu ý */}
      {note || isAuthenticated ? (
        <div className="mb-6">
          {editingNote ? (
            <div className="rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">📌 Lưu ý</p>
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600 resize-none"
                    placeholder="Nhập nội dung lưu ý..."
                  />
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:bg-amber-300"
                  >
                    {savingNote ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button
                    onClick={handleCancelEditNote}
                    className="rounded-xl border border-amber-300 dark:border-amber-600 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          ) : note ? (
            <div className="group relative rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg flex-shrink-0 mt-0.5">📌</span>
                <p className="flex-1 text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{note}</p>
                {isAuthenticated && user?.role === 'admin' && (
                  <button
                    onClick={handleStartEditNote}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded-xl bg-amber-100 dark:bg-amber-800/50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-700/50"
                    title="Sửa lưu ý"
                  >
                    ✏️ Sửa
                  </button>
                )}
              </div>
            </div>
          ) : isAuthenticated && user?.role === 'admin' && (
            <button
              onClick={handleStartEditNote}
              className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-600 p-4 w-full text-sm text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              + Thêm lưu ý
            </button>
          )}

          {/* Link đến trang liên hệ */}
          <Link
            to="/lien-he"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
          >
            Liên hệ hỗ trợ
          </Link>
        </div>
      ) : null}

      {/* Thanh tìm kiếm môn học */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-slate-700"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-800 p-8 text-center shadow-sm dark:shadow-slate-700/30">
          <p className="text-slate-600 dark:text-slate-400">
            {searchTerm.trim()
              ? `Không tìm thấy môn học "${searchTerm}".`
              : 'Chưa có khóa học nào. Vui lòng liên hệ admin để được cấp khóa học.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.map((course) => (
            <article key={course.id} className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h2>
                  {course.description && (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{course.description}</p>
                  )}
                </div>
                {/* Nút yêu thích hình trái tim - chỉ hiển thị khi đã đăng nhập */}
                {isAuthenticated && (
                  <button
                    onClick={(e) => handleToggleFavorite(course.id, e)}
                    className="ml-3 flex-shrink-0 p-1.5 rounded-full transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none"
                    title={course.isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                  >
                    <svg
                      className={`w-6 h-6 transition-colors duration-150 ${
                        course.isFavorite
                          ? 'text-red-500 fill-red-500'
                          : 'text-slate-400 dark:text-slate-500 fill-none hover:text-red-400 dark:hover:text-red-400'
                      }`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={course.isFavorite ? 0 : 2}
                      fill={course.isFavorite ? 'currentColor' : 'none'}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {course.unlocked && isAuthenticated ? (
                  <div className="flex gap-3">
                    {course.questionType === 'fill' ? (
                      <>
                        <button
                          onClick={() => navigate(`/fill-study/${course.id}`)}
                          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                        >
                          Ôn tập
                        </button>
                        <button
                          onClick={() => navigate(`/fill-exam/${course.id}`)}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          Thi thử
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/study/${course.id}`)}
                          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                        >
                          Ôn tập
                        </button>
                        <button
                          onClick={() => navigate(`/exam/${course.id}`)}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          Thi thử
                        </button>
                      </>
                    )}
                  </div>
                ) : isAuthenticated ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {unlockingCourseId === course.id ? (
                      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-lg min-w-[240px] relative z-50">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          Mở khóa "{course.title}" với <span className="text-amber-600">{course.requiredPoints} điểm</span>?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUnlock(course.id)}
                            disabled={unlockingLoading || userPoints < course.requiredPoints}
                            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white ${
                              userPoints < course.requiredPoints
                                ? 'bg-slate-300 cursor-not-allowed'
                                : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                          >
                            {unlockingLoading ? 'Đang mở...' : 'Mở khóa'}
                          </button>
                          <button
                            onClick={() => setUnlockingCourseId(null)}
                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            Hủy
                          </button>
                        </div>
                        {userPoints < course.requiredPoints && (
                          <p className="mt-2 text-xs text-red-500">Không đủ điểm (cần {course.requiredPoints})</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setUnlockingCourseId(course.id)}
                          onMouseEnter={(e) => { e.currentTarget.textContent = `Mở khóa (${course.requiredPoints}đ)`; }}
                          onMouseLeave={(e) => { e.currentTarget.textContent = `🔒 ${course.requiredPoints} điểm`; }}
                          className="rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-600 transition"
                        >
                          🔒 {course.requiredPoints} điểm
                        </button>
                        <button
                          onClick={() => navigate(`/preview/${course.id}`)}
                          className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
                        >
                          Dùng thử
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  /* Chưa đăng nhập: chỉ hiển thị nút dùng thử */
                  <button
                    onClick={() => navigate(`/preview/${course.id}`)}
                    className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
                  >
                    Dùng thử
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Overlay khi đang mở khóa (chỉ khi đã đăng nhập) */}
      {isAuthenticated && unlockingCourseId !== null && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => !unlockingLoading && setUnlockingCourseId(null)}></div>
      )}

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