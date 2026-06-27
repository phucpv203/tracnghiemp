/**
 * FillStudyPage - Ôn tập kiểu điền đáp án (xem hình và nhập câu trả lời)
 * 
 * Layout:
 * - Desktop: Trái = câu hỏi + input, Phải = hình ảnh
 * - Mobile: Trên = câu hỏi + input, Dưới = hình ảnh
 * - Có question-list (badge số) như StudyPage
 * - Phím tắt: a/← câu trước, d/→ câu tiếp, Enter kiểm tra
 * - Click ảnh → zoom toàn màn hình
 * - answers[0].answer_text = URL hình ảnh
 * - answers[1].answer_text = đáp án đúng, is_correct = true
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

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
  const [zoomedImage, setZoomedImage] = useState(null); // URL ảnh đang zoom

  const currentQuestion = questions[currentQuestionIndex];

  // Load course data
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
      }
    };
    loadData();
  }, [courseId]);

  // Restore from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`fill_study_answers_${courseId}`);
    if (savedAnswers) {
      setAnsweredQuestions(JSON.parse(savedAnswers));
    }
    const savedIndex = localStorage.getItem(`fill_study_index_${courseId}`);
    if (savedIndex !== null) {
      const idx = parseInt(savedIndex, 10);
      if (!isNaN(idx)) setCurrentQuestionIndex(idx);
    }
    setInitialIndexLoaded(true);
  }, [courseId]);

  // Restore state when question/index changes
  useEffect(() => {
    if (!initialIndexLoaded || !questions.length || !currentQuestion) return;

    const answered = answeredQuestions[currentQuestion.id];
    if (answered) {
      setUserInput(answered.input || '');
      setShowResult(true);
    } else {
      setUserInput('');
      setShowResult(false);
    }
  }, [initialIndexLoaded, questions, currentQuestion?.id, answeredQuestions]);

  // Update question list (horizontal scrollable badges)
  useEffect(() => {
    const questionListInner = document.getElementById('fill-question-list-inner');
    if (!questionListInner || !questions.length) return;

    questionListInner.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'flex gap-2';
    questions.forEach((q, index) => {
      const item = document.createElement('li');
      const answered = answeredQuestions[q.id];
      let itemBgClass, badgeClass;
      if (answered) {
        if (answered.isCorrect) {
          itemBgClass = 'bg-blue-100 dark:bg-blue-900/40';
          badgeClass = 'bg-blue-600 text-white';
        } else {
          itemBgClass = 'bg-red-100 dark:bg-red-900/40';
          badgeClass = 'bg-red-600 text-white';
        }
      } else {
        itemBgClass = index === currentQuestionIndex ? 'bg-sky-50 dark:bg-sky-900/30' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700';
        badgeClass = index === currentQuestionIndex ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300';
      }
      item.className = `flex flex-col items-center gap-1 p-2 w-14 rounded-xl transition cursor-pointer flex-shrink-0 ${itemBgClass}`;

      const numberBadge = document.createElement('span');
      numberBadge.className = `w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${badgeClass}`;
      numberBadge.textContent = index + 1;

      if (index === currentQuestionIndex) {
        item.dataset.current = 'true';
      }
      item.appendChild(numberBadge);
      item.onclick = () => handleGoToQuestion(index);
      ul.appendChild(item);
    });
    questionListInner.appendChild(ul);

    // Auto-scroll to current question
    const currentItem = ul.querySelector('[data-current="true"]');
    if (currentItem) {
      const container = questionListInner;
      const scrollAmount = currentItem.offsetLeft - container.offsetLeft - container.clientWidth / 2 + currentItem.clientWidth / 2;
      container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  }, [questions, currentQuestionIndex, answeredQuestions]);

  // Update navigation buttons
  useEffect(() => {
    const prevBtn = document.getElementById('fill-prev');
    const nextBtn = document.getElementById('fill-next');

    if (prevBtn) {
      prevBtn.onclick = handlePrev;
      prevBtn.disabled = currentQuestionIndex === 0;
      prevBtn.className = `inline-flex items-center justify-center rounded-3xl border px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
        currentQuestionIndex === 0
          ? 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
      }`;
    }

    if (nextBtn) {
      nextBtn.onclick = handleNext;
      nextBtn.disabled = currentQuestionIndex === questions.length - 1;
      nextBtn.className = `inline-flex items-center justify-center rounded-3xl px-4 py-3 text-sm font-semibold shadow-lg shadow-sky-500/10 transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
        currentQuestionIndex === questions.length - 1
          ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
          : 'bg-sky-600 text-white hover:bg-sky-700'
      }`;
    }
  }, [currentQuestionIndex, questions.length]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // a / ArrowLeft -> previous question
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
        return;
      }
      // d / ArrowRight -> next question
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }
      // Enter -> check answer (only when not yet checked)
      if (e.key === 'Enter' && !showResult && !e.shiftKey) {
        e.preventDefault();
        handleCheck();
        return;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, showResult, userInput, questions, answeredQuestions]);

  // Lưu tiến độ
  const saveProgress = (newAnswered, newIndex) => {
    localStorage.setItem(`fill_study_answers_${courseId}`, JSON.stringify(newAnswered));
    localStorage.setItem(`fill_study_index_${courseId}`, newIndex ?? currentQuestionIndex);
  };

  const handleCheck = () => {
    if (showResult || !currentQuestion) return;

    const correctAnswer = currentQuestion.answers?.find(a => a.is_correct);
    const correctText = correctAnswer?.answer_text || '';
    const normalizedInput = userInput.trim().toLowerCase().replace(/\s+/g, ' ');
    const normalizedCorrect = correctText.trim().toLowerCase().replace(/\s+/g, ' ');
    const isCorrect = normalizedInput === normalizedCorrect;

    setShowResult(true);
    const newAnswered = {
      ...answeredQuestions,
      [currentQuestion.id]: {
        input: userInput,
        correct: correctText,
        isCorrect
      }
    };
    setAnsweredQuestions(newAnswered);
    saveProgress(newAnswered, currentQuestionIndex);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      const nextQ = questions[nextIndex];
      const answered = answeredQuestions[nextQ?.id];
      if (answered) {
        setUserInput(answered.input || '');
        setShowResult(true);
      } else {
        setUserInput('');
        setShowResult(false);
      }
      saveProgress(answeredQuestions, nextIndex);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      const prevQ = questions[prevIndex];
      const answered = answeredQuestions[prevQ?.id];
      if (answered) {
        setUserInput(answered.input || '');
        setShowResult(true);
      } else {
        setUserInput('');
        setShowResult(false);
      }
      saveProgress(answeredQuestions, prevIndex);
    }
  };

  const handleReset = () => {
    setAnsweredQuestions({});
    setCurrentQuestionIndex(0);
    setUserInput('');
    setShowResult(false);
    localStorage.removeItem(`fill_study_answers_${courseId}`);
    localStorage.removeItem(`fill_study_index_${courseId}`);
  };

  const handleGoToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    const q = questions[index];
    const answered = answeredQuestions[q?.id];
    if (answered) {
      setUserInput(answered.input || '');
      setShowResult(true);
    } else {
      setUserInput('');
      setShowResult(false);
    }
    saveProgress(answeredQuestions, index);
  };

  if (!course) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex justify-center items-center min-h-[400px] text-slate-600 dark:text-slate-400">Đang tải...</div>
      </main>
    );
  }

  // Lấy URL hình ảnh (answers[0]) và đáp án đúng (answers[1])
  const imageUrl = currentQuestion?.answers?.[0]?.answer_text || '';
  const correctAnswer = currentQuestion?.answers?.find(a => a.is_correct);
  const correctText = correctAnswer?.answer_text || '';

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 rounded-3xl bg-white dark:bg-slate-800 p-5 shadow-sm dark:shadow-slate-700/30">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Điền đáp án - Quan sát hình và nhập câu trả lời</p>
        </div>
        <button onClick={() => navigate('/trang-chu')} className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
          Quay lại Trang chủ
        </button>
      </div>

      <div className="space-y-4">
        {/* Reset button */}
        <div className="flex justify-end">
          <button onClick={handleReset} className="rounded-3xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700">
            Xóa tiến độ
          </button>
        </div>

        {/* Question list (horizontal scrollable badges) */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm dark:shadow-slate-700/30">
          <div id="fill-question-list-inner" className="flex gap-2 overflow-x-auto pb-2"></div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span>Đã trả lời đúng</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span>Đã trả lời sai</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span>Chưa trả lời</span>
              </div>
            </div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Câu <span className="font-bold text-slate-900 dark:text-slate-100">{currentQuestionIndex + 1}</span>/{questions.length}
            </span>
          </div>
        </div>

        {/* Desktop: grid 2 cột; Mobile: stack dọc */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Question + Input */}
          <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-[0_24px_100px_-48px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_100px_-48px_rgba(0,0,0,0.5)]">
            <div className="mb-4">
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Câu {currentQuestionIndex + 1}/{questions.length}</span>
            </div>

            {/* Question content */}
            <div className="mb-5 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100">
              {currentQuestionIndex + 1}. {currentQuestion?.content}
            </div>

            {/* Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Câu trả lời của bạn:</label>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={showResult}
                placeholder="Nhập đáp án..."
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-800 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-600"
              />
            </div>

            {/* Result after checking */}
            {showResult && (
              <div className={`mb-4 rounded-2xl border p-4 ${
                answeredQuestions[currentQuestion.id]?.isCorrect
                  ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30'
              }`}>
                <p className={`text-sm font-semibold ${
                  answeredQuestions[currentQuestion.id]?.isCorrect
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {answeredQuestions[currentQuestion.id]?.isCorrect ? '✓ Chính xác!' : '✗ Sai rồi!'}
                </p>
                {!answeredQuestions[currentQuestion.id]?.isCorrect && (
                  <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                    Đáp án đúng: <strong>{correctText}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button id="fill-prev" className="inline-flex items-center justify-center rounded-3xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500">Câu trước</button>
              <button id="fill-next" className="inline-flex items-center justify-center rounded-3xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/10 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500">Câu tiếp</button>
              {!showResult ? (
                <button
                  onClick={handleCheck}
                  disabled={!userInput.trim()}
                  className="rounded-3xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                >
                  Kiểm tra
                </button>
              ) : null}
              {showResult && currentQuestionIndex < questions.length - 1 && (
                <button
                  onClick={handleNext}
                  className="rounded-3xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/10 hover:bg-green-700"
                >
                  Câu tiếp theo →
                </button>
              )}
            </div>
          </div>

          {/* Right: Image */}
          <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_24px_100px_-48px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_100px_-48px_rgba(0,0,0,0.5)]">
            {imageUrl ? (
              <div
                className="flex items-center justify-center min-h-[300px] cursor-zoom-in"
                onClick={() => setZoomedImage(imageUrl)}
              >
                <img
                  src={imageUrl}
                  alt={`Hình minh họa câu ${currentQuestionIndex + 1}`}
                  className="max-w-full h-auto rounded-2xl object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<p class="text-slate-400">Không thể tải hình ảnh</p>';
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[300px] text-slate-400 dark:text-slate-500">
                <p>Không có hình ảnh</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <img
            src={zoomedImage}
            alt="Phóng to"
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-2xl font-bold transition"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}