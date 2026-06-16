/**
 * GuestStudyPage - Trang học tập dùng thử cho guest (chưa đăng nhập)
 * 
 * Giao diện giống hệt StudyPage, nhưng:
 * - Chỉ hiển thị 20 câu hỏi đầu tiên
 * - KHÔNG lưu tiến độ (guest)
 * - Thay nút "Xóa tiến độ" bằng nút "Đăng nhập"
 * - Thêm banner kêu gọi đăng ký ở cuối
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../App';
import { apiService } from '../services/apiService';

export default function GuestStudyPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAuthenticated = !!user;
  
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [shuffledAnswersMap, setShuffledAnswersMap] = useState({});
  const [loading, setLoading] = useState(true);

  const currentQuestion = questions[currentQuestionIndex];

  // Load course and questions from API
  useEffect(() => {
    const loadPreview = async () => {
      try {
        const data = await apiService.getCoursePreview(courseId);
        setCourse(data.course);
        const loadedQuestions = data.course.questions || [];
        setQuestions(loadedQuestions);

        // Xáo trộn đáp án cho mỗi câu
        const shuffled = {};
        loadedQuestions.forEach((q) => {
          if (q.answers && Array.isArray(q.answers)) {
            shuffled[q.id] = shuffleArray([...q.answers]);
          }
        });
        setShuffledAnswersMap(shuffled);
      } catch (error) {
        console.error('Failed to load preview:', error);
        alert('Không thể tải dữ liệu môn học. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [courseId]);

  // Update question list (horizontal scrollable badges)
  useEffect(() => {
    const questionListInner = document.getElementById('question-list-inner');
    if (!questionListInner || !questions.length) return;

    questionListInner.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'flex gap-2';
    questions.forEach((q, index) => {
      const item = document.createElement('li');
      const answeredData = answeredQuestions[q.id];
      let itemBgClass, badgeClass;
      if (answeredData) {
        if (answeredData.isCorrect) {
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
    
    const currentItem = ul.querySelector('[data-current="true"]');
    if (currentItem) {
      const container = questionListInner;
      const scrollAmount = currentItem.offsetLeft - container.offsetLeft - container.clientWidth / 2 + currentItem.clientWidth / 2;
      container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  }, [questions, currentQuestionIndex, answeredQuestions]);

  // Update question display
  useEffect(() => {
    if (!currentQuestion) return;

    const questionEl = document.getElementById('question');
    const answersEl = document.getElementById('answers');
    const resultEl = document.getElementById('result');
    const explanationEl = document.getElementById('explanation');

    const contentParts = currentQuestion.content.split('\n\n');
    const questionText = contentParts[0];
    const explanationText = contentParts.length > 1 ? contentParts.slice(1).join('\n\n') : null;

    if (questionEl) {
      questionEl.innerHTML = `<span class="text-slate-900 dark:text-slate-100">${currentQuestionIndex + 1}. </span><span class="text-slate-900 dark:text-slate-100">${questionText}</span>`;
    }

    if (explanationEl) {
      if (showExplanation && explanationText) {
        const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
        const isCorrect = correctAnswer && Number(correctAnswer.id) === Number(selectedAnswer);
        explanationEl.innerHTML = `
          <div class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4">
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">💡 Giải thích:</p>
            <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">${explanationText}</p>
          </div>
        `;
        explanationEl.className = 'block';
      } else {
        explanationEl.innerHTML = '';
        explanationEl.className = 'hidden';
      }
    }

    if (answersEl) {
      answersEl.innerHTML = '';

      const displayAnswers = shuffledAnswersMap[currentQuestion.id] || currentQuestion.answers;
      if (displayAnswers && Array.isArray(displayAnswers)) {
        const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
        const isAnswered = answeredQuestions[currentQuestion.id] !== undefined;

        displayAnswers.forEach((answer, index) => {
          const btn = document.createElement('button');
          const letterLabel = String.fromCharCode(65 + index);
          btn.textContent = `${letterLabel}. ${answer.answer_text}`;
          btn.className = 'w-full text-left px-4 py-3 rounded-xl border transition font-medium text-sm';

          if (isAnswered) {
            btn.disabled = true;
            if (answer.is_correct) {
              btn.className += ' bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
            } else if (Number(answer.id) === Number(selectedAnswer) && selectedAnswer !== null) {
              btn.className += ' bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
            } else {
              btn.className += ' bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400';
            }
          } else {
            btn.className += ' bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30';
            btn.onclick = () => handleAnswerClick(answer.id, correctAnswer);
          }

          answersEl.appendChild(btn);
        });
      }
    }

    if (resultEl) {
      if (showExplanation) {
        const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
        const isCorrect = correctAnswer && Number(correctAnswer.id) === Number(selectedAnswer);
        resultEl.innerHTML = `
          <span class="${isCorrect ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'} font-semibold">
            ${isCorrect ? '✓ Chính xác!' : '✗ Sai rồi!'} 
            ${!isCorrect ? `Đáp án đúng: ${String.fromCharCode(65 + currentQuestion.answers.findIndex(a => a.is_correct))}` : ''}
          </span>
        `;
      } else {
        resultEl.textContent = '';
      }
    }
  }, [currentQuestionIndex, currentQuestion, selectedAnswer, showExplanation, answeredQuestions]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
        return;
      }
      if (e.key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }
      if (!showExplanation && currentQuestion && currentQuestion.answers) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 5) {
          const answerIndex = num - 1;
          if (answerIndex < currentQuestion.answers.length) {
            e.preventDefault();
            const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
            handleAnswerClick(currentQuestion.answers[answerIndex].id, correctAnswer);
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestionIndex, currentQuestion, showExplanation, answeredQuestions]);

  // Update navigation buttons
  useEffect(() => {
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');

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

  function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  const handleAnswerClick = (answerId, correctAnswer) => {
    if (showExplanation) return;
    
    const isCorrect = correctAnswer && Number(correctAnswer.id) === Number(answerId);
    setSelectedAnswer(answerId);
    setShowExplanation(true);

    setAnsweredQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        selected: answerId,
        correct: correctAnswer ? correctAnswer.id : null,
        isCorrect
      }
    }));

    setTimeout(() => {
      const explanationEl = document.getElementById('explanation');
      if (explanationEl) {
        explanationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      const nextQuestion = questions[nextIndex];
      const answeredData = answeredQuestions[nextQuestion?.id];
      if (answeredData) {
        setSelectedAnswer(answeredData.selected);
        setShowExplanation(true);
      } else {
        setSelectedAnswer(null);
        setShowExplanation(false);
      }
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      const prevQuestion = questions[prevIndex];
      const answeredData = answeredQuestions[prevQuestion?.id];
      if (answeredData) {
        setSelectedAnswer(answeredData.selected);
        setShowExplanation(true);
      } else {
        setSelectedAnswer(null);
        setShowExplanation(false);
      }
    }
  };

  const handleGoToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    const question = questions[index];
    const answeredData = answeredQuestions[question?.id];
    if (answeredData) {
      setSelectedAnswer(answeredData.selected);
      setShowExplanation(true);
    } else {
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4 rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30">
        <div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h1>
          {course.description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>
          )}
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Dùng thử {questions.length} câu hỏi đầu tiên</p>
        </div>
        <div className="flex gap-2">
          {!isAuthenticated && (
            <button onClick={() => navigate('/login')} className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
              Đăng nhập
            </button>
          )}
          <button onClick={() => navigate('/trang-chu')} className="rounded-2xl bg-slate-100 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
            ← Quay lại
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {!isAuthenticated && (
          <div className="flex justify-end">
            <button 
              onClick={() => navigate('/register')}
              className="rounded-3xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Đăng ký để học toàn bộ
            </button>
          </div>
        )}

        {/* Question list */}
        <div className="overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm dark:shadow-slate-700/30">
          <div id="question-list-inner" className="flex gap-2 overflow-x-auto pb-2"></div>
          
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
            <span className="font-semibold text-slate-600 dark:text-slate-400">Câu <span className="font-bold text-slate-900 dark:text-slate-100">{currentQuestionIndex + 1}</span>/{questions.length}</span>
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-[32px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-[0_24px_100px_-48px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_100px_-48px_rgba(0,0,0,0.5)]">
          <div id="question" className="mb-6 text-lg font-semibold leading-8 text-slate-900 dark:text-slate-100" aria-live="polite"></div>
          <div id="answers" className="space-y-3"></div>
          <div id="explanation" className="hidden"></div>
          
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <button id="prev" className="inline-flex items-center justify-center rounded-3xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500">Câu trước</button>
            <button id="next" className="inline-flex items-center justify-center rounded-3xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/10 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500">Câu tiếp</button>
            {showExplanation && (
              <button
                onClick={handleNext}
                className="inline-flex items-center justify-center rounded-3xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/10 transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Câu tiếp theo →
              </button>
            )}
            <div id="result" className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300 sm:mt-0 sm:ml-auto"></div>
          </div>
        </div>
      </div>

      {/* Call-to-action banner khi đã học xong câu cuối (chỉ hiển thị với guest chưa đăng nhập) */}
      {!isAuthenticated && currentQuestionIndex === questions.length - 1 && showExplanation && (
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