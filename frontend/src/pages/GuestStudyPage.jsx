/**
 * GuestStudyPage - Trang học tập dùng thử cho guest (chưa đăng nhập)
 * 
 * Giao diện giống hệt StudyPage, nhưng:
 * - Chỉ hiển thị 20 câu hỏi đầu tiên
 * - KHÔNG lưu tiến độ (guest)
 * - Thêm banner kêu gọi đăng ký ở cuối
 * - Refactor: pure React JSX
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';
import { Button, Card, Skeleton } from '../components/ui';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, SignIn, UserPlus } from '@phosphor-icons/react';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** StudyBadge - reuse from StudyPage */
function GuestBadge({ num, isCurrent, isCorrect, isWrong, onClick }) {
  let badgeClass;
  if (isCorrect) badgeClass = 'bg-primary-600 text-white';
  else if (isWrong) badgeClass = 'bg-danger-600 text-white';
  else if (isCurrent) badgeClass = 'bg-primary-600 text-white';
  else badgeClass = 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300';

  return (
    <button onClick={onClick} className={`w-10 h-10 flex items-center justify-center rounded-2xl font-semibold text-sm transition ${badgeClass}`} aria-label={`Câu ${num}`}>
      {num}
    </button>
  );
}

function GuestAnswerButton({ answer, displayIndex, isAnswered, isCorrectAnswer, isUserWrong, onClick }) {
  const letterLabel = String.fromCharCode(65 + displayIndex);
  let className = 'w-full text-left px-4 py-3 rounded-xl border transition font-medium text-sm ';
  if (isAnswered) {
    className += 'cursor-default ';
    if (isCorrectAnswer) className += 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-200';
    else if (isUserWrong) className += 'bg-danger-50 dark:bg-danger-900/30 border-danger-300 dark:border-danger-700 text-danger-800 dark:text-danger-200';
    else className += 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400';
  } else {
    className += 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 cursor-pointer';
  }
  return (
    <button onClick={isAnswered ? undefined : onClick} className={className} disabled={isAnswered}>
      {letterLabel}. {answer.answer_text}
    </button>
  );
}

export default function GuestStudyPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [shuffledAnswersMap, setShuffledAnswersMap] = useState({});
  const [loading, setLoading] = useState(true);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const data = await apiService.getCoursePreview(courseId);
        setCourse(data.course);
        const loadedQuestions = data.course.questions || [];
        setQuestions(loadedQuestions);
        const shuffled = {};
        loadedQuestions.forEach((q) => {
          if (q.answers && Array.isArray(q.answers)) {
            shuffled[q.id] = shuffleArray([...q.answers]);
          }
        });
        setShuffledAnswersMap(shuffled);
      } catch (error) {
        console.error('Failed to load preview:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [courseId]);

  const handleAnswerClick = (answerId, correctAnswer) => {
    const isCorrect = correctAnswer && Number(correctAnswer.id) === Number(answerId);
    setSelectedAnswer(answerId);
    setShowExplanation(true);
    setAnsweredQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: { selected: answerId, correct: correctAnswer?.id, isCorrect }
    }));
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') { e.preventDefault(); setCurrentQuestionIndex(p => Math.max(0, p - 1)); }
    else if (e.key === 'd' || e.key === 'ArrowRight') { e.preventDefault(); setCurrentQuestionIndex(p => Math.min(questions.length - 1, p + 1)); }
    else if (!showExplanation && currentQuestion?.answers) {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 5) {
        const displayAnswers = shuffledAnswersMap[currentQuestion.id] || currentQuestion.answers;
        if (num - 1 < displayAnswers.length) {
          e.preventDefault();
          const correct = currentQuestion.answers.find(a => a.is_correct);
          handleAnswerClick(displayAnswers[num - 1].id, correct);
        }
      }
    }
  }, [currentQuestionIndex, currentQuestion, showExplanation, answeredQuestions, questions.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton variant="card" />
          <Skeleton variant="card" height={300} />
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Card className="text-center py-16">
          <p className="text-slate-600 dark:text-slate-400">Không tìm thấy khóa học</p>
          <Button variant="primary" onClick={() => navigate('/trang-chu')} className="mt-4">Quay lại Trang chủ</Button>
        </Card>
      </main>
    );
  }

  const contentParts = currentQuestion?.content?.split('\n\n') || [];
  const questionText = contentParts[0] || '';
  const explanationText = contentParts.length > 1 ? contentParts.slice(1).join('\n\n') : null;

  const correctAnswer = currentQuestion?.answers?.find(a => a.is_correct);
  const isAnswered = currentQuestion ? answeredQuestions[currentQuestion.id] !== undefined : false;
  const answeredData = currentQuestion ? answeredQuestions[currentQuestion.id] : null;
  const isUserCorrect = answeredData?.isCorrect;

  const totalQuestions = questions.length;
  const correctCount = Object.values(answeredQuestions).filter(d => d.isCorrect).length;
  const wrongCount = Object.values(answeredQuestions).filter(d => !d.isCorrect).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Banner call-to-action */}
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Bản dùng thử</h2>
            <p className="mt-1 text-sm text-primary-100">Đăng nhập để ôn tập đầy đủ và lưu tiến độ học tập!</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>
              <SignIn size={16} weight="bold" />
              Đăng nhập
            </Button>
            <Button variant="success" size="sm" onClick={() => navigate('/register')}>
              <UserPlus size={16} weight="bold" />
              Đăng ký
            </Button>
          </div>
        </div>
      </div>

      {/* Header */}
      <Card padding="md" className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h1>
            {course.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>}
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Dùng thử miễn phí — {questions.length} câu hỏi</p>
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-success-600 dark:text-success-400"><CheckCircle size={14} weight="fill" /> Đúng: {correctCount}</span>
              <span className="flex items-center gap-1 text-danger-600 dark:text-danger-400"><XCircle size={14} weight="fill" /> Sai: {wrongCount}</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/trang-chu')}>
            <ArrowLeft size={16} weight="bold" />
            Quay lại
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        {/* Question number bar */}
        <Card padding="sm">
          <div className="flex flex-wrap items-center gap-3">
            {questions.map((q, index) => {
              const data = answeredQuestions[q.id];
              return (
                <GuestBadge
                  key={q.id} num={index + 1}
                  isCurrent={index === currentQuestionIndex}
                  isCorrect={data?.isCorrect}
                  isWrong={data && !data.isCorrect}
                  onClick={() => setCurrentQuestionIndex(index)}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold">Danh sách câu hỏi</span>
            <span>Câu <strong className="text-slate-900 dark:text-slate-100">{currentQuestionIndex + 1}</strong>/{totalQuestions}</span>
          </div>
        </Card>

        {/* Question */}
        <Card padding="lg">
          <div className="mb-6 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100" aria-live="polite">
            <span>{currentQuestionIndex + 1}. </span>
            <span dangerouslySetInnerHTML={{ __html: questionText }} />
          </div>

          <div className="space-y-3">
            {(shuffledAnswersMap[currentQuestion?.id] || currentQuestion?.answers || []).map((answer, idx) => (
              <GuestAnswerButton
                key={answer.id} answer={answer} displayIndex={idx}
                isAnswered={isAnswered}
                isCorrectAnswer={answer.is_correct}
                isUserWrong={isAnswered && Number(answer.id) === Number(selectedAnswer) && selectedAnswer !== null && !answer.is_correct}
                onClick={() => { const correct = currentQuestion.answers.find(a => a.is_correct); handleAnswerClick(answer.id, correct); }}
              />
            ))}
          </div>

          {isAnswered && explanationText && (
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">💡 Giải thích:</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{explanationText}</p>
            </div>
          )}

          {isAnswered && (
            <p className={`mt-3 text-sm font-semibold flex items-center gap-1 ${isUserCorrect ? 'text-primary-600 dark:text-primary-400' : 'text-danger-500 dark:text-danger-400'}`}>
              {isUserCorrect ? <><CheckCircle size={16} weight="fill" /> Chính xác!</> : <><XCircle size={16} weight="fill" /> Sai rồi!</>}
            </p>
          )}

          <div className="mt-8 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))} disabled={currentQuestionIndex === 0}>
              <ArrowLeft size={16} weight="bold" /> Câu trước
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCurrentQuestionIndex(p => Math.min(questions.length - 1, p + 1))} disabled={currentQuestionIndex === totalQuestions - 1}>
              Câu tiếp <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}