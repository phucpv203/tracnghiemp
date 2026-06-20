/**
 * FillExamPage - Thi thử kiểu điền đáp án (xem hình và nhập câu trả lời)
 * 
 * Layout:
 * - Desktop: Trái = câu hỏi + input, Phải = hình ảnh (KHÔNG có question list)
 * - Mobile: Trên = câu hỏi + input, Dưới = hình ảnh
 * - 45 phút, auto-submit khi hết giờ
 * - answers[0].answer_text = URL hình ảnh
 * - answers[1].answer_text = đáp án đúng, is_correct = true
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { apiService } from '../services/apiService';

export default function FillExamPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInputs, setUserInputs] = useState({});   // {questionId: "text"}
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [correctAnswers, setCorrectAnswers] = useState({}); // {questionId: "correctText"}

  const currentQuestion = questions[currentQuestionIndex];

  // Timer ref
  useEffect(() => {
    if (!submitted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (timeLeft === 0 && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, submitted]);

  // Load exam
  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiService.getExam(courseId);
        const examData = data.exam;
        setExam(examData);
        setQuestions(examData.data || []);

        const initialInputs = {};
        const correct = {};
        if (examData.data) {
          examData.data.forEach(q => {
            initialInputs[q.id] = '';
            const correctAns = q.answers?.find(a => a.is_correct);
            if (correctAns) correct[q.id] = correctAns.answer_text;
          });
        }
        setUserInputs(initialInputs);
        setCorrectAnswers(correct);
      } catch (error) {
        console.error('Failed to load exam:', error);
        alert('Không thể tải đề thi.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  const handleInputChange = (questionId, value) => {
    if (submitted) return;
    setUserInputs(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    try {
      const answersArray = questions.map(q => ({
        questionId: q.id,
        text: userInputs[q.id] || ''
      }));
      const resultData = await apiService.submitExam(courseId, answersArray);
      setResult(resultData);
    } catch (error) {
      console.error('Failed to submit:', error);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen text-slate-600 dark:text-slate-400">Đang tải...</div>;
  if (!exam) return <div className="flex justify-center items-center min-h-screen text-slate-600 dark:text-slate-400">Không tìm thấy đề thi</div>;

  const imageUrl = currentQuestion?.answers?.[0]?.answer_text || '';
  const correctText = correctAnswers[currentQuestion?.id] || '';

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 rounded-3xl bg-white dark:bg-slate-800 p-5 shadow-sm dark:shadow-slate-700/30">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{exam.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Điền đáp án - Thi thử 45 phút</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/trang-chu')} className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
            Quay lại
          </button>
        </div>
      </div>

      {/* Timer + Submit */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-sky-200 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/30 p-4 sm:p-5">
        <div className="text-base font-semibold text-red-600 dark:text-red-400">
          Thời gian: <span className="font-mono">{formatTime(timeLeft)}</span>
        </div>
        {!submitted && (
          <button onClick={handleSubmit} className="rounded-3xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/10 hover:bg-sky-700">
            Nộp bài
          </button>
        )}
      </div>

      {/* Result panel */}
      {result && (
        <div className="mb-6 rounded-3xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-5 shadow-sm">
          <div className="text-lg font-semibold text-amber-900 dark:text-amber-300">
            Kết quả: <span className="text-2xl">{result.score}%</span>
          </div>
          <div className="mt-2 text-sm text-amber-900 dark:text-amber-400">
            <p>Số câu trả lời đúng: {result.correctCount}/{result.totalQuestions}</p>
            <p>Kết quả: <strong>{result.passed ? '✓ Đạt' : '✗ Không đạt'}</strong></p>
          </div>
        </div>
      )}

      {/* Main content: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Question + Input */}
        <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-[0_24px_100px_-48px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_100px_-48px_rgba(0,0,0,0.5)]">
          <div className="mb-4">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Câu {currentQuestionIndex + 1}/{questions.length}</span>
          </div>

          <div className="mb-5 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100">
            {currentQuestionIndex + 1}. {currentQuestion?.content}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Câu trả lời của bạn:</label>
            <input
              type="text"
              value={userInputs[currentQuestion?.id] || ''}
              onChange={(e) => handleInputChange(currentQuestion.id, e.target.value)}
              disabled={submitted}
              placeholder="Nhập đáp án..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitted && currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(prev => prev + 1);
                }
              }}
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-800 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-600"
            />
          </div>

          {submitted && (
            <div className={`mb-4 rounded-2xl border p-4 ${
              (userInputs[currentQuestion?.id] || '').trim().toLowerCase() === correctText.trim().toLowerCase()
                ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30'
                : 'border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30'
            }`}>
              <p className={`text-sm font-semibold ${
                (userInputs[currentQuestion?.id] || '').trim().toLowerCase() === correctText.trim().toLowerCase()
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {userInputs[currentQuestion?.id]?.trim() && (userInputs[currentQuestion.id].trim().toLowerCase() === correctText.trim().toLowerCase())
                  ? '✓ Chính xác!' : '✗ Sai rồi!'}
              </p>
              <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                Đáp án đúng: <strong>{correctText}</strong>
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="rounded-3xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Câu trước
            </button>
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
              className="rounded-3xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/10 hover:bg-sky-700 disabled:bg-sky-300 disabled:cursor-not-allowed"
            >
              Câu tiếp
            </button>
          </div>
        </div>

        {/* Right: Image */}
        <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_24px_100px_-48px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_100px_-48px_rgba(0,0,0,0.5)]">
          {imageUrl ? (
            <div className="flex items-center justify-center min-h-[300px]">
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

      {/* Progress dots */}
      {submitted && (
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Đúng</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>Sai</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span>Bỏ qua</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, idx) => {
              const userAns = (userInputs[q.id] || '').trim().toLowerCase();
              const correctAns = (correctAnswers[q.id] || '').trim().toLowerCase();
              const isCorrect = userAns === correctAns && userAns !== '';
              const isSkipped = userAns === '';
              let dotClass = 'w-4 h-4 rounded-full ';
              if (isSkipped) {
                dotClass += 'bg-slate-300 dark:bg-slate-600';
              } else if (isCorrect) {
                dotClass += 'bg-blue-500';
              } else {
                dotClass += 'bg-red-500';
              }
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`${dotClass} ${idx === currentQuestionIndex ? 'ring-2 ring-sky-400' : ''}`}
                  title={`Câu ${idx + 1}${isSkipped ? ' - Bỏ qua' : (isCorrect ? ' - Đúng' : ' - Sai')}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}