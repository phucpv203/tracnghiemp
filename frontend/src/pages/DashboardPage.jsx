/**
 * DashboardPage - Trang chủ hiển thị danh sách môn học
 * 
 * Chức năng chính:
 * - Hiển thị thông tin user đã đăng nhập
 * - Hiển thị điểm của user
 * - Lấy danh sách khóa học từ database
 * - Cho phép mở khóa môn học bằng điểm
 * - Cho phép điều hướng đến trang ôn tập hoặc thi thử
 */
import { useContext, useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

export default function DashboardPage() {
  const { user, onLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // State management
  const [courses, setCourses] = useState([]);        // Danh sách khóa học từ DB
  const [progress, setProgress] = useState([]);      // Tiến độ học tập
  const [userPoints, setUserPoints] = useState(0);    // Điểm của user
  const [loading, setLoading] = useState(true);      // Đang tải dữ liệu
  const [unlockingCourseId, setUnlockingCourseId] = useState(null); // Môn đang xác nhận mở khóa
  const [unlockingLoading, setUnlockingLoading] = useState(false);
  const [toast, setToast] = useState(null); // {message, type: 'success'|'error'}
  const [searchTerm, setSearchTerm] = useState('');   // Từ khóa tìm kiếm môn học

  // Load data from API
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const coursesData = await apiService.getCourses();
        setCourses(coursesData.items || []);
        
        const progressData = await apiService.getProgress();
        setProgress(progressData.progress || []);
        setUserPoints(progressData.points || 0);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);
  
  // Build map courseId -> progress data for quick lookup
  const progressMap = useMemo(() => {
    const map = new Map();
    progress.forEach(p => {
      map.set(Number(p.courseId), p);
    });
    return map;
  }, [progress]);

  // Process courses with their status and sort: unlocked first (A-Z), then locked (A-Z)
  const activeCourses = useMemo(() => {
    const processed = courses.map(course => {
      const userProgress = progressMap.get(Number(course.id));
      // Unlocked = có record trong user_progress (status bất kỳ: learning/completed)
      // Locked = chưa có record, cần dùng điểm để mở
      const isUnlocked = !!userProgress;
      const requiredPoints = Number(course.required_points) || 0;
      
      return {
        id: course.id,
        title: course.title,
        unlocked: isUnlocked,
        requiredPoints
      };
    });

    // Sắp xếp: mở khóa lên đầu (A-Z), chưa mở khóa ở dưới (A-Z)
    return processed.sort((a, b) => {
      if (a.unlocked !== b.unlocked) {
        return a.unlocked ? -1 : 1;
      }
      return a.title.localeCompare(b.title, 'vi');
    });
  }, [courses, progressMap]);

  // Filter courses based on search term
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return activeCourses;
    const keyword = searchTerm.trim().toLowerCase();
    return activeCourses.filter(course =>
      course.title.toLowerCase().includes(keyword)
    );
  }, [activeCourses, searchTerm]);

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
        setToast({ message: result.message || 'Mở khóa thành công!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (error) {
      console.error('[Dashboard] Unlock error:', error);
      setToast({ message: error.message || 'Không thể mở khóa môn học.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setUnlockingLoading(false);
      setUnlockingCourseId(null);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-slate-600">Đang tải...</div>
        </div>
      </main>
    );
  }
  
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Trang chủ môn học</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Xin chào, {user?.name || user?.email}</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">Chọn môn học để ôn tập hoặc thi thử.</p>
          {user?.role === 'admin' && (
            <Link to="/admin" className="mt-3 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
              Mở trang quản trị Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3 text-center relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Điểm của bạn</p>
            <p className="text-2xl font-bold text-amber-700">{userPoints}</p>
            <button
              onClick={() => navigate('/topup')}
              className="mt-2 w-full rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition"
            >
              + Nạp thêm điểm
            </button>
          </div>
          <button onClick={onLogout} className="self-start rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm môn học */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm môn học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
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
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">
            {searchTerm.trim()
              ? `Không tìm thấy môn học "${searchTerm}".`
              : 'Chưa có khóa học nào. Vui lòng liên hệ admin để được cấp khóa học.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.map((course) => (
            <article key={course.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-900">{course.title}</h2>
              
              {course.unlocked ? (
                <div className="flex flex-shrink-0 gap-3">
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
                </div>
              ) : (
                <div className="flex flex-shrink-0">
                  {unlockingCourseId === course.id ? (
                    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-lg min-w-[240px] relative z-50">
                      <p className="text-sm font-semibold text-slate-700 mb-3">
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
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Hủy
                        </button>
                      </div>
                      {userPoints < course.requiredPoints && (
                        <p className="mt-2 text-xs text-red-500">Không đủ điểm (cần {course.requiredPoints})</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setUnlockingCourseId(course.id)}
                      onMouseEnter={(e) => { e.currentTarget.textContent = `Mở khóa (${course.requiredPoints}đ)`; }}
                      onMouseLeave={(e) => { e.currentTarget.textContent = `🔒 ${course.requiredPoints} điểm`; }}
                      className="rounded-full bg-slate-100 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition"
                    >
                      🔒 {course.requiredPoints} điểm
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Overlay khi đang mở khóa */}
      {unlockingCourseId !== null && (
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