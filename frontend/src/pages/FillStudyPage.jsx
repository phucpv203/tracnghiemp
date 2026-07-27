/**
 * FillStudyPage - Ôn tập kiểu điền đáp án (xem hình và nhập câu trả lời)
 * Refactor: pure React JSX (no DOM manipulation)
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Button, Card, Skeleton } from '../components/ui';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, MagnifyingGlassPlus, X } from '@phosphor-icons/react';

export default function FillStudyPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [initialIndexLoaded, setInitialIndexLoaded] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentQuestion = questions[currentQuestionIndex];
  const inputRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await apiService.getCourseDetail(courseId);
        setCourse(data.course);
        setQuestions(data.course.questions || []);
      } catch (error) {
        console.error('Failed to load:', error);
        if (error.code === 'COURSE_LOCKED') {
          alert(error.message);
          navigate('/trang-chu');
        } else {
          alert('Không thể tải dữ liệu học tập.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [courseId, navigate]);

  // Load localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`fill_study_${courseId}`);
    if (saved) setAnsweredQuestions(JSON.parse(saved));
    const savedIndex = localStorage.getItem(`fill_study_index_${courseId}`);
    if (savedIndex !== null) {
      const idx = parseInt(savedIndex, 10);
      if (!isNaN(idx)) setCurrentQuestionIndex(idx);
    }
    setInitialIndexLoaded(true);
  }, [courseId]);

  // Restore state when question changes
  useEffect(() => {
    if (!initialIndexLoaded || !currentQuestion) return;
    const data = answeredQuestions[currentQuestion.id];
    if (data) {
      setUserInput(data.answer || '');
      setShowResult(true);
    } else {
      setUserInput('');
      setShowResult(false);
    }
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentQuestionIndex, initialIndexLoaded, currentQuestion?.id]);

  // Save index
  useEffect(() => {
    if (initialIndexLoaded) {
      localStorage.setItem(`fill_study_index_${courseId}`, currentQuestionIndex);
    }
  }, [currentQuestionIndex, initialIndexLoaded]);

  const saveAnswers = (newAnswers) => {
    setAnsweredQuestions(newAnswers);
    localStorage.setItem(`fill_study_${courseId}`, JSON.stringify(newAnswers));
  };

  const handleCheck = () => {
    if (!userInput.trim() || showResult) return;
    const correctText = currentQuestion?.answers?.[1]?.answer_text?.trim().toLowerCase();
    const userText = userInput.trim().toLowerCase();
    const isCorrect = userText === correctText;

    const newAnswers = {
      ...answeredQuestions,
      [currentQuestion.id]: { answer: userInput.trim(), isCorrect }
    };
    saveAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
    else if (e.key === 'd' || e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
    else if (e.key === 'Enter' && !showResult && userInput.trim()) { e.preventDefault(); handleCheck(); }
    else if (e.key === 'Enter' && showResult && currentQuestionIndex < questions.length - 1) { e.preventDefault(); handleNext(); }
  }, [currentQuestionIndex, questions.length, showResult, userInput]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleResetProgress = () => {
    setAnsweredQuestions({});
    setCurrentQuestionIndex(0);
    setUserInput('');
    setShowResult(false);
    localStorage.removeItem(`fill_study_${courseId}`);
    localStorage.removeItem(`fill_study_index_${courseId}`);
  };

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-10"><Skeleton variant="card" height={400} /></main>;
  }

  if (!course) {
    return <main className="mx-auto max-w-6xl px-4 py-10"><Card className="text-center py-16"><p>Không tìm thấy khóa học</p></Card></main>;
  }

  const imageUrl = currentQuestion?.answers?.[0]?.answer_text;
  const correctText = currentQuestion?.answers?.[1]?.answer_text;
  const isCorrect = showResult && answeredQuestions[currentQuestion.id]?.isCorrect;

  // Stats
  const correctCount = Object.values(answeredQuestions).filter(d => d.isCorrect).length;
  const wrongCount = Object.values(answeredQuestions).filter(d => !d.isCorrect).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Ôn tập - Điền đáp án • Câu {currentQuestionIndex + 1}/{questions.length}</p>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-success-600"><CheckCircle size={14} weight="fill" /> Đúng: {correctCount}</span>
              <span className="flex items-center gap-1 text-danger-600"><XCircle size={14} weight="fill" /> Sai: {wrongCount}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleResetProgress}><X size={16} weight="bold" /> Xóa tiến độ</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/trang-chu')}><ArrowLeft size={16} weight="bold" /> Quay lại</Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Question + Input */}
        <div className="flex-1">
          <Card padding="lg" className="h-full">
            <div className="mb-5 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100">
              <span>{currentQuestionIndex + 1}. </span>
              <span>{currentQuestion?.content?.split('\n\n')[0] || ''}</span>
            </div>

            <div className="space-y-4">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={showResult}
                placeholder="Nhập đáp án..."
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-600 transition"
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
            </div>

            {/* Result */}
            {showResult && (
              <div className={`mt-4 rounded-2xl border p-4 ${isCorrect ? 'border-success-200 dark:border-success-700 bg-success-50 dark:bg-success-900/30' : 'border-danger-200 dark:border-danger-700 bg-danger-50 dark:bg-danger-900/30'}`}>
                <p className={`text-sm font-semibold flex items-center gap-1 ${isCorrect ? 'text-success-700 dark:text-success-300' : 'text-danger-700 dark:text-danger-300'}`}>
                  {isCorrect ? <><CheckCircle size={16} weight="fill" /> Chính xác!</> : <><XCircle size={16} weight="fill" /> Sai rồi!</>}
                </p>
                {!isCorrect && <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">Đáp án đúng: <strong>{correctText}</strong></p>}
              </div>
            )}

            {/* Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handlePrev} disabled={currentQuestionIndex === 0}>
                <ArrowLeft size={16} weight="bold" /> Câu trước
              </Button>
              <Button variant="primary" size="sm" onClick={handleNext} disabled={currentQuestionIndex === questions.length - 1}>
                Câu tiếp <ArrowRight size={16} weight="bold" />
              </Button>
              {!showResult ? (
                <Button variant="success" size="sm" onClick={handleCheck} disabled={!userInput.trim()}>
                  Kiểm tra
                </Button>
              ) : null}
              {showResult && currentQuestionIndex < questions.length - 1 && (
                <Button variant="success" size="sm" onClick={handleNext}>
                  Câu tiếp theo <ArrowRight size={16} weight="bold" />
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Image */}
        <div className="lg:w-96">
          <Card padding="sm" className="h-full">
            {imageUrl ? (
              <div className="flex items-center justify-center min-h-[300px] cursor-zoom-in" onClick={() => setZoomedImage(imageUrl)}>
                <img src={imageUrl} alt={`Hình minh họa câu ${currentQuestionIndex + 1}`}
                  className="max-w-full h-auto rounded-2xl object-contain"
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<p class="text-slate-400">Không thể tải hình ảnh</p>'; }} />
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[300px] text-slate-400"><p>Không có hình ảnh</p></div>
            )}
          </Card>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="Phóng to" className="max-w-full max-h-full object-contain rounded-2xl" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition">
            <X size={24} weight="bold" />
          </button>
        </div>
      )}
    </main>
  );
}