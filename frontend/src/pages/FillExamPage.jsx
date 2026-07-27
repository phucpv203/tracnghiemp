/**
 * FillExamPage - Thi thử kiểu điền đáp án (xem hình và nhập câu trả lời)
 * Refactor: pure React JSX (no DOM manipulation)
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { Button, Card, Skeleton } from '../components/ui';
import { Clock, ArrowLeft, ArrowRight, CheckCircle, XCircle, X } from '@phosphor-icons/react';

export default function FillExamPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userInputs, setUserInputs] = useState({});
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [correctAnswers, setCorrectAnswers] = useState({});
  const [zoomedImage, setZoomedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer
  useEffect(() => {
    if (!submitted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (timeLeft === 0 && !submitted) handleSubmit();
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
          examData.data.forEach((q) => {
            initialInputs[q.id] = '';
            correct[q.id] = q.answers?.[1]?.answer_text || '';
          });
        }
        setUserInputs(initialInputs);
        setCorrectAnswers(correct);
      } catch (error) {
        console.error('Failed to load exam:', error);
        if (error.code === 'COURSE_LOCKED') {
          alert(error.message);
          navigate('/trang-chu');
        } else {
          alert('Không thể tải đề thi.');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, navigate]);

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitting(true);
    try {
      const answersArray = questions.map(q => ({
        questionId: q.id,
        answerText: userInputs[q.id] || ''
      }));
      const resultData = await apiService.submitExam(courseId, answersArray, 1);
      setResult(resultData);
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit exam:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-10"><Skeleton variant="card" height={400} /></main>;
  }

  if (!exam) {
    return <main className="mx-auto max-w-6xl px-4 py-10"><Card className="text-center py-16"><p>Không tìm thấy đề thi</p></Card></main>;
  }

  const imageUrl = currentQuestion?.answers?.[0]?.answer_text;
  const correctText = currentQuestion?.answers?.[1]?.answer_text;
  const userAnswer = userInputs[currentQuestion?.id] || '';

  // Stats
  const answeredCount = Object.values(userInputs).filter(v => v.trim() !== '').length;
  const totalQuestions = questions.length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{exam.title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Thi thử - Điền đáp án</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-base font-semibold text-danger-600 dark:text-danger-400">
              <Clock size={20} weight="fill" />
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
            {!submitted && (
              <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting}>
                Nộp bài ({answeredCount}/{totalQuestions})
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate('/trang-chu')}>
              <ArrowLeft size={16} weight="bold" /> Quay lại
            </Button>
          </div>
        </div>
      </Card>

      {/* Result */}
      {result && (
        <Card padding="sm" className="mb-6 border-warning-200 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/30" role="status">
          <p className="text-lg font-semibold text-warning-900 dark:text-warning-300">Kết quả: <span className="text-2xl">{result.score}%</span></p>
          <p className="text-sm text-warning-700 dark:text-warning-400">Số câu đúng: {result.correctCount}/{result.totalQuestions} · <strong>{result.passed ? '✓ Đạt' : '✗ Không đạt'}</strong></p>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Input */}
        <div className="flex-1">
          <Card padding="lg" className="h-full">
            <div className="mb-5 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100">
              <span>{currentQuestionIndex + 1}. </span>
              <span>{currentQuestion?.content?.split('\n\n')[0] || ''}</span>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={userInputs[currentQuestion?.id] || ''}
                onChange={(e) => setUserInputs(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                disabled={submitted}
                placeholder="Nhập đáp án..."
                className="w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-800 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-600 transition"
              />
            </div>

            {/* After submit: show correct/incorrect */}
            {submitted && (
              <div className={`mt-4 rounded-2xl border p-4 ${
                userAnswer.trim().toLowerCase() === correctText?.trim().toLowerCase()
                  ? 'border-success-200 dark:border-success-700 bg-success-50 dark:bg-success-900/30'
                  : 'border-danger-200 dark:border-danger-700 bg-danger-50 dark:bg-danger-900/30'
              }`}>
                <p className="text-sm font-semibold flex items-center gap-1">
                  {userAnswer.trim().toLowerCase() === correctText?.trim().toLowerCase() ? (
                    <><CheckCircle size={16} weight="fill" className="text-success-600" /> <span className="text-success-700">Chính xác!</span></>
                  ) : (
                    <><XCircle size={16} weight="fill" className="text-danger-600" /> <span className="text-danger-700">Sai! Đáp án: <strong>{correctText}</strong></span></>
                  )}
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))}
                disabled={currentQuestionIndex === 0}>
                <ArrowLeft size={16} weight="bold" /> Câu trước
              </Button>
              <Button variant="primary" size="sm" onClick={() => setCurrentQuestionIndex(p => Math.min(totalQuestions - 1, p + 1))}
                disabled={currentQuestionIndex === totalQuestions - 1}>
                Câu tiếp <ArrowRight size={16} weight="bold" />
              </Button>
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

      {/* Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
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