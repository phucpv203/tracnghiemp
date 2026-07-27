/**
 * StudyPage - Trang học tập với câu hỏi trắc nghiệm
 * 
 * Chức năng chính:
 * - Hiển thị câu hỏi từ database theo courseId
 * - Cho phép người dùng chọn đáp án và kiểm tra ngay lập tức
 * - Theo dõi tiến độ học tập
 * - Lưu tiến độ vào localStorage
 * - Lưu vị trí câu hỏi hiện tại
 * - Chế độ luyện câu sai
 * - Refactor: uses pure React JSX (no DOM manipulation)
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Button, Card, Skeleton } from '../components/ui';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, ArrowClockwise, ArrowFatLeft } from '@phosphor-icons/react';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Study Question Badge */
function StudyBadge({ num, isCurrent, isCorrect, isWrong, isUnanswered, onClick }) {
  let itemBg, badgeClass;
  if (isCorrect) {
    itemBg = 'bg-primary-100 dark:bg-primary-900/40';
    badgeClass = 'bg-primary-600 text-white';
  } else if (isWrong) {
    itemBg = 'bg-danger-100 dark:bg-danger-900/40';
    badgeClass = 'bg-danger-600 text-white';
  } else if (isCurrent) {
    itemBg = 'bg-primary-50 dark:bg-primary-900/30';
    badgeClass = 'bg-primary-600 text-white';
  } else {
    itemBg = 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700';
    badgeClass = 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300';
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 w-14 rounded-xl transition cursor-pointer flex-shrink-0 ${itemBg}`}
      aria-label={`Câu ${num}`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${badgeClass}`}>
        {num}
      </span>
    </button>
  );
}

/** Answer button for study mode */
function StudyAnswerButton({ answer, displayIndex, isAnswered, isCorrectAnswer, isUserWrong, isNotAnswered, onClick }) {
  const letterLabel = String.fromCharCode(65 + displayIndex);
  let className = 'w-full text-left px-4 py-3 rounded-xl border transition font-medium text-sm ';

  if (isAnswered) {
    className += 'cursor-default ';
    if (isCorrectAnswer) {
      className += 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-200';
    } else if (isUserWrong) {
      className += 'bg-danger-50 dark:bg-danger-900/30 border-danger-300 dark:border-danger-700 text-danger-800 dark:text-danger-200';
    } else {
      className += 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400';
    }
  } else {
    className += 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30 cursor-pointer';
  }

  return (
    <button
      onClick={isAnswered ? undefined : onClick}
      className={className}
      disabled={isAnswered}
    >
      {letterLabel}. {answer.answer_text}
    </button>
  );
}

export default function StudyPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [shuffledAnswersMap, setShuffledAnswersMap] = useState({});
  const [initialIndexLoaded, setInitialIndexLoaded] = useState(false);
  const [wrongAnswerMode, setWrongAnswerMode] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentQuestion = wrongAnswerMode ? wrongQuestions[currentQuestionIndex] : questions[currentQuestionIndex];
  const listQuestions = wrongAnswerMode ? wrongQuestions : questions;
  const questionListRef = useRef(null);

  // Load course data
  useEffect(() => {
    const loadStudyData = async () => {
      try {
        const data = await apiService.getCourseDetail(courseId);
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
        console.error('Failed to load study data:', error);
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
    loadStudyData();
  }, [courseId, navigate]);

  // Load localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`study_answers_${courseId}`);
    if (savedAnswers) {
      setAnsweredQuestions(JSON.parse(savedAnswers));
    }
    const savedIndex = localStorage.getItem(`study_index_${courseId}`);
    if (savedIndex !== null) {
      const idx = parseInt(savedIndex, 10);
      if (!isNaN(idx)) setCurrentQuestionIndex(idx);
    }
    setInitialIndexLoaded(true);
  }, [courseId]);

  // Restore state when question changes
  useEffect(() => {
    if (!initialIndexLoaded || !questions.length || !currentQuestion) return;

    if (wrongAnswerMode) {
      setSelectedAnswer(null);
      setShowExplanation(false);
      return;
    }

    const answeredData = answeredQuestions[currentQuestion.id];
    if (answeredData) {
      setSelectedAnswer(answeredData.selected);
      setShowExplanation(true);
    } else {
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  }, [initialIndexLoaded, questions, currentQuestion?.id, wrongAnswerMode]);

  // Auto-scroll question list
  useEffect(() => {
    if (questionListRef.current && listQuestions.length > 0) {
      const currentItem = questionListRef.current.querySelector(`[data-index="${currentQuestionIndex}"]`);
      if (currentItem) {
        const container = questionListRef.current;
        const scrollAmount = currentItem.offsetLeft - container.offsetLeft - container.clientWidth / 2 + currentItem.clientWidth / 2;
        container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  }, [currentQuestionIndex, listQuestions.length]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'a' || e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'd' || e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (!showExplanation && currentQuestion && currentQuestion.answers) {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 5) {
        const displayAnswers = shuffledAnswersMap[currentQuestion.id] || currentQuestion.answers;
        if (num - 1 < displayAnswers.length) {
          e.preventDefault();
          const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
          handleAnswerClick(displayAnswers[num - 1].id, correctAnswer);
        }
      }
    }
  }, [currentQuestionIndex, currentQuestion, showExplanation, answeredQuestions, listQuestions.length, wrongAnswerMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleAnswerClick = (answerId, correctAnswer) => {
    const isCorrect = correctAnswer && Number(correctAnswer.id) === Number(answerId);
    setSelectedAnswer(answerId);
    setShowExplanation(true);

    const newAnsweredQuestions = {
      ...answeredQuestions,
      [currentQuestion.id]: {
        selected: answerId,
        correct: correctAnswer ? correctAnswer.id : null,
        isCorrect
      }
    };
    setAnsweredQuestions(newAnsweredQuestions);
    localStorage.setItem(`study_answers_${courseId}`, JSON.stringify(newAnsweredQuestions));

    // Scroll to explanation
    setTimeout(() => {
      const explanationEl = document.getElementById('explanation');
      if (explanationEl) {
        explanationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleNext = () => {
    if (currentQuestionIndex < listQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      localStorage.setItem(`study_index_${courseId}`, nextIndex);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      localStorage.setItem(`study_index_${courseId}`, prevIndex);
    }
  };

  const handleGoToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    localStorage.setItem(`study_index_${courseId}`, index);
  };

  const handleResetProgress = () => {
    setAnsweredQuestions({});
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setWrongAnswerMode(false);
    setWrongQuestions([]);
    localStorage.removeItem(`study_answers_${courseId}`);
    localStorage.removeItem(`study_index_${courseId}`);
  };

  const handleWrongAnswerPractice = () => {
    const wrongIds = Object.entries(answeredQuestions)
      .filter(([_, data]) => !data.isCorrect)
      .map(([id]) => Number(id));

    if (wrongIds.length === 0) {
      alert('Không có câu trả lời sai nào để luyện tập!');
      return;
    }

    const wrongQs = questions.filter(q => wrongIds.includes(Number(q.id)));
    setWrongQuestions(wrongQs);
    setWrongAnswerMode(true);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  const handleBackToNormalStudy = () => {
    setWrongAnswerMode(false);
    setWrongQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    const savedIndex = localStorage.getItem(`study_index_${courseId}`);
    if (savedIndex !== null) {
      const idx = parseInt(savedIndex, 10);
      if (!isNaN(idx)) setCurrentQuestionIndex(idx);
    }
  };

  // Loading
  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" height={300} />
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Card className="text-center py-16">
          <p className="text-slate-600 dark:text-slate-400">Không tìm thấy khóa học</p>
          <Button variant="primary" onClick={() => navigate('/trang-chu')} className="mt-4">
            Quay lại Trang chủ
          </Button>
        </Card>
      </main>
    );
  }

  // Current question data
  const contentParts = currentQuestion?.content?.split('\n\n') || [];
  const questionText = contentParts[0] || '';
  const explanationText = contentParts.length > 1 ? contentParts.slice(1).join('\n\n') : null;

  const correctAnswer = currentQuestion?.answers?.find(a => a.is_correct);
  const isAnswered = currentQuestion ? answeredQuestions[currentQuestion.id] !== undefined : false;
  const answeredData = currentQuestion ? answeredQuestions[currentQuestion.id] : null;
  const isUserCorrect = answeredData?.isCorrect;

  // Stats
  const totalQuestions = listQuestions.length;
  const correctCount = Object.values(answeredQuestions).filter(d => d.isCorrect).length;
  const wrongCount = Object.values(answeredQuestions).filter(d => !d.isCorrect).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <Card padding="md" className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h1>
            {course.description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>
            )}
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {wrongAnswerMode 
                ? `Luyện tập ${wrongQuestions.length} câu sai` 
                : 'Ôn tập lại nội dung quan trọng và xem lại cấu trúc đề.'}
            </p>
            {/* Score */}
            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-success-600 dark:text-success-400">
                <CheckCircle size={14} weight="fill" />
                Đúng: {correctCount}
              </span>
              <span className="flex items-center gap-1 text-danger-600 dark:text-danger-400">
                <XCircle size={14} weight="fill" />
                Sai: {wrongCount}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Tổng: {totalQuestions}
              </span>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/trang-chu')}>
            <ArrowLeft size={16} weight="bold" />
            Quay lại
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          {wrongAnswerMode && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleBackToNormalStudy}
            >
              <ArrowFatLeft size={16} weight="fill" />
              Về ôn tập
            </Button>
          )}
          {!wrongAnswerMode && (
            <Button
              size="sm"
              variant="danger"
              onClick={handleWrongAnswerPractice}
            >
              <XCircle size={16} weight="bold" />
              Luyện câu sai
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={handleResetProgress}
          >
            <ArrowClockwise size={16} weight="bold" />
            Xóa tiến độ
          </Button>
        </div>

        {/* Question list */}
        <Card padding="sm">
          <div ref={questionListRef} className="flex gap-2 overflow-x-auto pb-2">
            {listQuestions.map((q, index) => {
              const data = answeredQuestions[q.id];
              const isCorrect = data?.isCorrect;
              const isWrong = data && !data.isCorrect;
              return (
                <StudyBadge
                  key={q.id}
                  num={index + 1}
                  isCurrent={index === currentQuestionIndex}
                  isCorrect={isCorrect}
                  isWrong={isWrong}
                  onClick={() => handleGoToQuestion(index)}
                  data-index={index}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary-500"></span>
                <span>Đã trả lời đúng</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-danger-500"></span>
                <span>Đã trả lời sai</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span>Chưa trả lời</span>
              </div>
            </div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Câu <span className="font-bold text-slate-900 dark:text-slate-100">{currentQuestionIndex + 1}</span>/{totalQuestions}
            </span>
          </div>
        </Card>

        {/* Question & Answers */}
        <Card padding="lg">
          <div className="mb-6 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100" aria-live="polite">
            <span>{currentQuestionIndex + 1}. </span>
            <span dangerouslySetInnerHTML={{ __html: questionText }} />
          </div>

          <div className="space-y-3" id="answers">
            {(shuffledAnswersMap[currentQuestion?.id] || currentQuestion?.answers || []).map((answer, idx) => {
              const isCorrectAnswer = answer.is_correct;
              const isUserWrong = isAnswered && Number(answer.id) === Number(selectedAnswer) && selectedAnswer !== null && !isCorrectAnswer;
              return (
                <StudyAnswerButton
                  key={answer.id}
                  answer={answer}
                  displayIndex={idx}
                  isAnswered={isAnswered}
                  isCorrectAnswer={isCorrectAnswer}
                  isUserWrong={isUserWrong}
                  onClick={() => {
                    const correct = currentQuestion.answers.find(a => a.is_correct);
                    handleAnswerClick(answer.id, correct);
                  }}
                />
              );
            })}
          </div>

          {/* Explanation */}
          <div id="explanation" className={showExplanation ? 'block' : 'hidden'}>
            {showExplanation && explanationText && (
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">💡 Giải thích:</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{explanationText}</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrev}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft size={16} weight="bold" />
              Câu trước
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              disabled={currentQuestionIndex === totalQuestions - 1}
            >
              Câu tiếp
              <ArrowRight size={16} weight="bold" />
            </Button>
            {showExplanation && currentQuestionIndex < totalQuestions - 1 && (
              <Button
                variant="success"
                size="sm"
                onClick={handleNext}
              >
                Câu tiếp theo
                <ArrowRight size={16} weight="bold" />
              </Button>
            )}

            {/* Result feedback */}
            {showExplanation && (
              <span className={`ml-auto text-sm font-semibold ${
                isUserCorrect ? 'text-primary-600 dark:text-primary-400' : 'text-danger-500 dark:text-danger-400'
              }`}>
                {isUserCorrect ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle size={16} weight="fill" />
                    Chính xác!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle size={16} weight="fill" />
                    Sai rồi!
                  </span>
                )}
              </span>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}