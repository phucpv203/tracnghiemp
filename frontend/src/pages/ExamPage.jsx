/**
 * ExamPage - Trang làm bài thi trắc nghiệm
 * 
 * Chức năng chính:
 * - Hiển thị đề thi với thời gian giới hạn (45 phút)
 * - Cho phép điều hướng giữa các câu hỏi
 * - Tự động nộp bài khi hết giờ
 * - Hiển thị kết quả ngay sau khi nộp
 * - Hiển thị giải thích và màu sắc đáp án sau khi nộp
 * - Lưu kết quả vào database
 * - Refactor: uses pure React JSX (no DOM manipulation)
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Button, Card, Skeleton } from '../components/ui';
import { ArrowLeft, ArrowRight, Clock, CheckCircle, XCircle } from '@phosphor-icons/react';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Question Number Button */
function QuestionNumber({ num, isCurrent, isAnswered, isCorrect, isWrong, isSkipped, onClick }) {
  let bgClass;
  if (isCorrect) bgClass = 'bg-primary-600 text-white';
  else if (isWrong) bgClass = 'bg-danger-500 text-white';
  else if (isAnswered) bgClass = 'bg-success-100 dark:bg-success-900/40 text-success-900 dark:text-success-200 border border-success-300 dark:border-success-700';
  else if (isCurrent) bgClass = 'bg-primary-600 text-white';
  else bgClass = 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600';

  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center rounded-2xl font-semibold text-sm transition ${bgClass}`}
      aria-label={`Câu ${num}`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      {num}
    </button>
  );
}

/** Answer Option - clickable radio style */
function AnswerOption({ answer, displayIndex, isSelected, isSubmitted, isCorrectAnswer, isUserWrong, onSelect }) {
  if (isSubmitted) {
    let borderClass, bgClass, textClass, icon;
    if (isCorrectAnswer) {
      borderClass = 'border-primary-400 dark:border-primary-600';
      bgClass = 'bg-primary-50 dark:bg-primary-900/30';
      textClass = 'text-primary-800 dark:text-primary-200';
      icon = <CheckCircle size={20} weight="fill" className="text-primary-600 dark:text-primary-400 flex-shrink-0" />;
    } else if (isUserWrong) {
      borderClass = 'border-danger-400 dark:border-danger-600';
      bgClass = 'bg-danger-50 dark:bg-danger-900/30';
      textClass = 'text-danger-800 dark:text-danger-200';
      icon = <XCircle size={20} weight="fill" className="text-danger-600 dark:text-danger-400 flex-shrink-0" />;
    } else {
      borderClass = 'border-slate-200 dark:border-slate-600';
      bgClass = 'bg-white dark:bg-slate-700';
      textClass = 'text-slate-600 dark:text-slate-400';
      icon = null;
    }
    return (
      <div className={`flex items-center gap-3 rounded-3xl border ${borderClass} ${bgClass} p-4 ${textClass}`}>
        {icon}
        <span>{answer.answer_text}</span>
      </div>
    );
  }

  return (
    <label className={`flex items-center gap-3 rounded-3xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 cursor-pointer transition hover:border-primary-300 dark:hover:border-primary-600 has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-900/30`}>
      <input
        type="radio"
        name={`question-${answer.question_id}`}
        value={answer.id}
        checked={isSelected}
        onChange={onSelect}
        className="accent-primary-600"
      />
      <span className="text-slate-700 dark:text-slate-300">{answer.answer_text}</span>
    </label>
  );
}

export default function ExamPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [correctAnswers, setCorrectAnswers] = useState({});
  const [shuffledAnswersMap, setShuffledAnswersMap] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const questionListRef = useRef(null);

  // Load exam data
  useEffect(() => {
    const loadExam = async () => {
      try {
        const data = await apiService.getExam(courseId);
        const examData = data.exam;
        setExam(examData);
        setQuestions(examData.data || []);

        const initialAnswers = {};
        const correct = {};
        const shuffled = {};
        if (examData.data && Array.isArray(examData.data)) {
          examData.data.forEach((q) => {
            initialAnswers[q.id] = null;
            const correctAns = q.answers.find(a => a.is_correct);
            if (correctAns) correct[q.id] = correctAns.id;
            shuffled[q.id] = shuffleArray([...q.answers]);
          });
        }
        setAnswers(initialAnswers);
        setCorrectAnswers(correct);
        setShuffledAnswersMap(shuffled);
      } catch (error) {
        console.error('Failed to load exam:', error);
        if (error.code === 'COURSE_LOCKED') {
          alert(error.message);
          navigate('/trang-chu');
        } else {
          alert('Không thể tải đề thi. Vui lòng kiểm tra kết nối hoặc thử lại sau.');
        }
      } finally {
        setLoading(false);
      }
    };
    loadExam();
  }, [courseId, navigate]);

  // Timer
  useEffect(() => {
    if (!submitted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (timeLeft === 0 && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, submitted]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (submitted) return;
    if (e.key === 'a' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'd' || e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
    } else if (currentQuestion && currentQuestion.answers) {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 5) {
        const displayAnswers = shuffledAnswersMap[currentQuestion.id] || currentQuestion.answers;
        if (num - 1 < displayAnswers.length) {
          e.preventDefault();
          handleAnswerSelect(displayAnswers[num - 1].id);
        }
      }
    }
  }, [submitted, currentQuestion, questions.length, shuffledAnswersMap]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-scroll question list
  useEffect(() => {
    if (questionListRef.current && questions.length > 0) {
      const currentBtn = questionListRef.current.querySelector(`[data-index="${currentQuestionIndex}"]`);
      if (currentBtn) {
        const container = questionListRef.current;
        const scrollAmount = currentBtn.offsetLeft - container.offsetLeft - container.clientWidth / 2 + currentBtn.clientWidth / 2;
        container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  }, [currentQuestionIndex, questions.length]);

  const handleAnswerSelect = (answerId) => {
    if (!submitted) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: answerId }));
    }
  };

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitting(true);
    try {
      const answersArray = questions.map(q => ({
        questionId: q.id,
        answerId: answers[q.id]
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

  // Loading state
  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </main>
    );
  }

  if (!exam) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="text-center py-16">
          <p className="text-slate-600 dark:text-slate-400">Không tìm thấy đề thi</p>
          <Button variant="primary" onClick={() => navigate('/trang-chu')} className="mt-4">
            Quay lại Trang chủ
          </Button>
        </Card>
      </main>
    );
  }

  // Extract question content and explanation
  const contentParts = currentQuestion?.content?.split('\n\n') || [];
  const questionText = contentParts[0] || '';
  const explanationText = contentParts.length > 1 ? contentParts.slice(1).join('\n\n') : null;

  const correctAnswer = currentQuestion?.answers?.find(a => a.is_correct);
  const userAnswerId = answers[currentQuestion?.id];
  const isUserAnswerCorrect = correctAnswer && Number(correctAnswer.id) === Number(userAnswerId);

  const answeredCount = Object.values(answers).filter(a => a !== null).length;
  const totalQuestions = questions.length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <Card padding="md" className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{exam.title}</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Chuẩn bị sẵn sàng để hoàn thành bài thi thử với các câu hỏi trắc nghiệm.</p>
      </Card>

      <div className="space-y-6">
        {/* Back button */}
        <div className="flex justify-between items-center">
          <Button variant="secondary" size="sm" onClick={() => navigate('/trang-chu')}>
            <ArrowLeft size={16} weight="bold" />
            Quay lại
          </Button>

          {/* Result panel */}
          {result && (
            <Card padding="sm" className="!p-4 border-warning-200 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/30" role="status">
              <div className="text-lg font-semibold text-warning-900 dark:text-warning-300">
                Kết quả: <span className="text-2xl">{result.score}%</span>
              </div>
              <div className="mt-1 text-sm text-warning-700 dark:text-warning-400">
                <p>Số câu đúng: {result.correctCount}/{result.totalQuestions}</p>
                <p>Kết quả: <strong>{result.passed ? '✓ Đạt' : '✗ Không đạt'}</strong></p>
              </div>
            </Card>
          )}
        </div>

        {/* Timer bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-base font-semibold text-danger-600 dark:text-danger-400">
            <Clock size={20} weight="fill" />
            <span>Thời gian: </span>
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
          {!submitted && (
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              Nộp bài ({answeredCount}/{totalQuestions})
            </Button>
          )}
        </div>

        {/* Legend (after submit) */}
        {submitted && (
          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary-500"></span>
              <span>Trả lời đúng</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-danger-500"></span>
              <span>Trả lời sai</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span>Chưa trả lời</span>
            </div>
          </div>
        )}

        {/* Question number list */}
        <Card padding="sm">
          <div ref={questionListRef} className="flex flex-wrap items-center gap-3 overflow-x-auto pb-1">
            {questions.map((q, index) => {
              const isCorrect = submitted && correctAnswers[q.id] && Number(answers[q.id]) === Number(correctAnswers[q.id]);
              const isWrong = submitted && answers[q.id] !== null && !isCorrect;
              const isSkipped = submitted && answers[q.id] === null;
              const isAnswered = !submitted && answers[q.id] !== null;
              return (
                <QuestionNumber
                  key={q.id}
                  num={index + 1}
                  isCurrent={index === currentQuestionIndex}
                  isAnswered={isAnswered}
                  isCorrect={isCorrect}
                  isWrong={isWrong}
                  isSkipped={isSkipped}
                  onClick={() => setCurrentQuestionIndex(index)}
                  data-index={index}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Danh sách câu hỏi</span>
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Câu <span className="font-bold text-slate-900 dark:text-slate-100">{currentQuestionIndex + 1}</span>/{totalQuestions}
            </span>
          </div>
        </Card>

        {/* Question & Answers */}
        <Card padding="lg">
          <div className="mb-5 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100" aria-live="polite">
            <span>{currentQuestionIndex + 1}. </span>
            <span dangerouslySetInnerHTML={{ __html: questionText }} />
          </div>

          <div className="space-y-3">
            {(shuffledAnswersMap[currentQuestion?.id] || currentQuestion?.answers || []).map((answer) => {
              const isSelected = Number(answers[currentQuestion.id]) === Number(answer.id);
              const isCorrectAnswer = answer.is_correct;
              const isUserWrong = submitted && isSelected && !isCorrectAnswer;
              return (
                <AnswerOption
                  key={answer.id}
                  answer={answer}
                  isSelected={isSelected}
                  isSubmitted={submitted}
                  isCorrectAnswer={isCorrectAnswer}
                  isUserWrong={isUserWrong}
                  onSelect={() => handleAnswerSelect(answer.id)}
                />
              );
            })}
          </div>

          {/* Explanation (after submit) */}
          {submitted && explanationText && (
            <div className={`mt-4 rounded-2xl border p-4 ${
              isUserAnswerCorrect
                ? 'border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/30'
                : 'border-danger-200 dark:border-danger-700 bg-danger-50 dark:bg-danger-900/30'
            }`}>
              <p className={`text-sm font-semibold ${isUserAnswerCorrect ? 'text-primary-700 dark:text-primary-300' : 'text-danger-700 dark:text-danger-300'}`}>
                💡 Giải thích:
              </p>
              <p className={`mt-2 text-sm ${isUserAnswerCorrect ? 'text-primary-600 dark:text-primary-400' : 'text-danger-600 dark:text-danger-400'} leading-relaxed`}>
                {explanationText}
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft size={16} weight="bold" />
              Câu trước
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Câu tiếp
              <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}