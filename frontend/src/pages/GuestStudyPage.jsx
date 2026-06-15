/**
 * GuestStudyPage - Trang học tập dùng thử cho guest (chưa đăng nhập)
 * 
 * Chức năng:
 * - Hiển thị 20 câu hỏi đầu tiên của môn học
 * - Cho phép chọn đáp án và xem kết quả ngay
 * - KHÔNG lưu tiến độ (guest)
 * - Có nút kêu gọi đăng nhập để học tiếp
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

export default function GuestStudyPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const loadPreview = async () => {
      try {
        // Lấy thông tin course + questions từ API preview (20 câu đầu)
        const data = await apiService.getCoursePreview(courseId);
        setCourse(data.course);
        setQuestions(data.course.questions || []);
      } catch (error) {
        console.error('Failed to load preview:', error);
        alert('Không thể tải dữ liệu môn học. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [courseId]);

  const handleSelectAnswer = (answerId) => {
    if (showResult) return;
    
    const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
    const correct = correctAnswer && Number(correctAnswer.id) === Number(answerId);
    
    setSelectedAnswer(answerId);
    setIsCorrect(correct);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-slate-600 dark:text-slate-400">Đang tải...</div>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-slate-600 dark:text-slate-400">Không tìm thấy môn học.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h1>
            {course.description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>
            )}
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Dùng thử {questions.length} câu hỏi đầu tiên
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600"
          >
            Đăng nhập để học tiếp
          </button>
        </div>
      </div>

      {/* Question list indicator */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Câu {currentQuestionIndex + 1} / {questions.length}
        </span>
        <div className="flex gap-1">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentQuestionIndex(index);
                setSelectedAnswer(null);
                setShowResult(false);
                setIsCorrect(false);
              }}
              className={`w-8 h-8 rounded-full text-xs font-semibold transition ${
                index === currentQuestionIndex
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-[0_24px_100px_-48px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_100px_-48px_rgba(0,0,0,0.5)]">
        {currentQuestion && (
          <>
            <h2 className="mb-6 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100">
              {currentQuestionIndex + 1}. {currentQuestion.content}
            </h2>

            <div className="space-y-3">
              {currentQuestion.answers.map((answer, index) => {
                const letter = String.fromCharCode(65 + index);
                let btnClass = 'w-full text-left px-4 py-3 rounded-xl border transition font-medium text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300';
                
                if (showResult) {
                  if (answer.is_correct) {
                    btnClass = 'w-full text-left px-4 py-3 rounded-xl border transition font-medium text-sm bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
                  } else if (Number(answer.id) === Number(selectedAnswer)) {
                    btnClass = 'w-full text-left px-4 py-3 rounded-xl border transition font-medium text-sm bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
                  } else {
                    btnClass = 'w-full text-left px-4 py-3 rounded-xl border transition font-medium text-sm bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400';
                  }
                } else {
                  btnClass += ' hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 cursor-pointer';
                }

                return (
                  <button
                    key={answer.id}
                    onClick={() => handleSelectAnswer(answer.id)}
                    className={btnClass}
                    disabled={showResult}
                  >
                    {letter}. {answer.answer_text}
                  </button>
                );
              })}
            </div>

            {/* Result feedback */}
            {showResult && (
              <div className="mt-6">
                <div className={`rounded-2xl p-4 ${
                  isCorrect 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' 
                    : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
                }`}>
                  <p className={`text-sm font-semibold ${
                    isCorrect ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'
                  }`}>
                    {isCorrect ? '✓ Chính xác!' : '✗ Sai rồi!'}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentQuestionIndex === 0}
                  className={`rounded-3xl border px-4 py-3 text-sm font-semibold transition ${
                    currentQuestionIndex === 0
                      ? 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-600 text-slate-400 cursor-not-allowed'
                      : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ← Câu trước
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                    currentQuestionIndex === questions.length - 1
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-sky-600 text-white hover:bg-sky-700 shadow-lg shadow-sky-500/10'
                  }`}
                >
                  Câu tiếp →
                </button>
              </div>

              {currentQuestionIndex === questions.length - 1 && (
                <button
                  onClick={() => navigate('/login')}
                  className="rounded-3xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/10"
                >
                  Đăng nhập để học toàn bộ
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Call-to-action banner */}
      {currentQuestionIndex === questions.length - 1 && showResult && (
        <div className="mt-8 rounded-3xl bg-gradient-to-r from-sky-500 to-blue-600 p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold">Bạn muốn học toàn bộ môn học?</h2>
          <p className="mt-2 text-blue-100">Đăng nhập hoặc đăng ký để truy cập đầy đủ câu hỏi, thi thử và theo dõi tiến độ học tập.</p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate('/register')}
              className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-sky-700 hover:bg-blue-50"
            >
              Đăng ký miễn phí
            </button>
            <button
              onClick={() => navigate('/login')}
              className="rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      )}
    </main>
  );
}