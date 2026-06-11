/**
 * StudyPage - Trang học tập với câu hỏi trắc nghiệm
 * 
 * Chức năng chính:
 * - Hiển thị câu hỏi từ database theo courseId
 * - Cho phép người dùng chọn đáp án và kiểm tra ngay lập tức
 * - Theo dõi tiến độ học tập
 * - Lưu tiến độ vào localStorage để không mất khi tải lại trang
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

export default function StudyPage() {
  // Lấy courseId từ URL params
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [course, setCourse] = useState(null);           // Thông tin khóa học
  const [questions, setQuestions] = useState([]);       // Danh sách câu hỏi
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Câu hỏi hiện tại
  const [selectedAnswer, setSelectedAnswer] = useState(null);          // Đáp án đã chọn
  const [showExplanation, setShowExplanation] = useState(false);       // Hiển thị giải thích
  const [answeredQuestions, setAnsweredQuestions] = useState({}); // Các câu đã trả lời
  const [shuffledAnswersMap, setShuffledAnswersMap] = useState({}); // {questionId: [answers]} - đáp án đã xáo trộn

  // Compute current question (must be before useEffects that use it)
  const currentQuestion = questions[currentQuestionIndex];

  // ========== ALL useEffect HOOKS MUST BE BEFORE ANY EARLY RETURN ==========
  
  // Load course and questions from database
  useEffect(() => {
    const loadStudyData = async () => {
      console.log('Loading study data for courseId:', courseId);
      try {
        const data = await apiService.getCourseDetail(courseId);
        console.log('Study data received:', data);
        
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
        console.error('Failed to load study data:', error);
        alert('Không thể tải dữ liệu học tập. Vui lòng kiểm tra kết nối hoặc thử lại sau.');
      }
    };
    loadStudyData();
  }, [courseId]);

  // Load answers from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`study_answers_${courseId}`);
    if (savedAnswers) {
      setAnsweredQuestions(JSON.parse(savedAnswers));
    }
  }, [courseId]);

  // Update DOM elements for question list (horizontal scrollable display)
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
          itemBgClass = 'bg-blue-100';
          badgeClass = 'bg-blue-600 text-white';
        } else {
          itemBgClass = 'bg-red-100';
          badgeClass = 'bg-red-600 text-white';
        }
      } else {
        itemBgClass = index === currentQuestionIndex ? 'bg-sky-50' : 'bg-white hover:bg-slate-50';
        badgeClass = index === currentQuestionIndex ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-600';
      }
      item.className = `flex flex-col items-center gap-1 p-2 w-14 rounded-xl transition cursor-pointer flex-shrink-0 ${itemBgClass}`;
      
      // Question number badge
      const numberBadge = document.createElement('span');
      numberBadge.className = `w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${badgeClass}`;
      numberBadge.textContent = index + 1;
      
      // Mark current item with data attribute for scrolling
      if (index === currentQuestionIndex) {
        item.dataset.current = 'true';
      }
      item.appendChild(numberBadge);
      item.onclick = () => handleGoToQuestion(index);
      ul.appendChild(item);
    });
    questionListInner.appendChild(ul);
    
    // Auto-scroll to current question (chỉ cuộn ngang, tránh cuộn dọc)
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

    // Extract question text and explanation (separated by \n\n)
    const contentParts = currentQuestion.content.split('\n\n');
    const questionText = contentParts[0];
    const explanationText = contentParts.length > 1 ? contentParts.slice(1).join('\n\n') : null;

    if (questionEl) {
      questionEl.innerHTML = `<span class="text-slate-900">${currentQuestionIndex + 1}. </span><span class="text-slate-900">${questionText}</span>`;
    }

    // Show/hide explanation
    if (explanationEl) {
      if (showExplanation && explanationText) {
        const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
        const isCorrect = correctAnswer && Number(correctAnswer.id) === Number(selectedAnswer);
        explanationEl.innerHTML = `
          <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-semibold text-slate-700">💡 Giải thích:</p>
            <p class="mt-2 text-sm text-slate-600 leading-relaxed">${explanationText}</p>
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

      // Lấy danh sách đáp án đã xáo trộn (nếu có), nếu không thì dùng thứ tự gốc
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
            // Already answered -> show colors and disable
            btn.disabled = true;
            if (answer.is_correct) {
              // Correct answer: blue
              btn.className += ' bg-blue-50 border-blue-300 text-blue-800';
            } else if (Number(answer.id) === Number(selectedAnswer) && selectedAnswer !== null) {
              // User's wrong selection: red
              btn.className += ' bg-red-50 border-red-300 text-red-800';
            } else {
              // Other answers: white
              btn.className += ' bg-white border-slate-200 text-slate-600';
            }
          } else {
            // Not answered yet -> allow selecting
            btn.className += ' bg-white border-slate-200 text-slate-700 hover:border-sky-400 hover:bg-sky-50';
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
          <span class="${isCorrect ? 'text-blue-600' : 'text-red-500'} font-semibold">
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
      // a / ArrowLeft -> previous question
      if (e.key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
        return;
      }
      
      // d / ArrowRight -> next question
      if (e.key === 'd' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }
      
      // 1, 2, 3, 4, 5 -> select answer by index (chỉ khi chưa trả lời câu này)
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
          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
      }`;
    }

    if (nextBtn) {
      nextBtn.onclick = handleNext;
      nextBtn.disabled = currentQuestionIndex === questions.length - 1;
      nextBtn.className = `inline-flex items-center justify-center rounded-3xl px-4 py-3 text-sm font-semibold shadow-lg shadow-sky-500/10 transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
        currentQuestionIndex === questions.length - 1
          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
          : 'bg-sky-600 text-white hover:bg-sky-700'
      }`;
    }
  }, [currentQuestionIndex, questions.length]);

  // ========== NOW IT'S SAFE TO DO EARLY RETURN ==========
  if (!course) return <div className="flex justify-center items-center min-h-screen text-slate-600 dark:text-slate-400">Đang tải...</div>;

  function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  const handleAnswerClick = (answerId, correctAnswer) => {
    // Immediately process the answer
    const isCorrect = correctAnswer && Number(correctAnswer.id) === Number(answerId);

    // Set selected answer
    setSelectedAnswer(answerId);
    setShowExplanation(true);

    // Update answered questions
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

  const handleCheckAnswer = () => {
    if (selectedAnswer === null || showExplanation) return;

    const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
    const isCorrect = correctAnswer && Number(correctAnswer.id) === Number(selectedAnswer);

    setShowExplanation(true);

    // Update answered questions
    const newAnsweredQuestions = {
      ...answeredQuestions,
      [currentQuestion.id]: {
        selected: selectedAnswer,
        correct: correctAnswer ? correctAnswer.id : null,
        isCorrect
      }
    };
    setAnsweredQuestions(newAnsweredQuestions);
    localStorage.setItem(`study_answers_${courseId}`, JSON.stringify(newAnsweredQuestions));
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

  const handleResetProgress = () => {
    setAnsweredQuestions({});
    localStorage.removeItem(`study_answers_${courseId}`);
  };

  const handleGoToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    
    // Check if this question was already answered
    const question = questions[index];
    const answeredData = answeredQuestions[question?.id];
    
    if (answeredData) {
      // Restore the answered state
      setSelectedAnswer(answeredData.selected);
      setShowExplanation(true);
    } else {
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between gap-4 rounded-3xl bg-white dark:bg-slate-800 p-6 shadow-sm dark:shadow-slate-700/30">
        <div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{course.title}</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Ôn tập lại nội dung quan trọng và xem lại cấu trúc đề.</p>
        </div>
        <button onClick={() => navigate('/trang-chu')} className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
          Quay lại Trang chủ
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex justify-end">
          <button 
            onClick={handleResetProgress}
            className="rounded-3xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            Xóa tiến độ
          </button>
        </div>

        <div id="question-list" className="overflow-hidden rounded-[28px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm dark:shadow-slate-700/30">
          <div id="question-list-inner" className="flex gap-2 overflow-x-auto pb-2"></div>
          
          {/* Chú thích trạng thái + số câu */}
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
                <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                <span>Chưa trả lời</span>
              </div>
            </div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Câu <span className="font-bold text-slate-900 dark:text-slate-100">{currentQuestionIndex + 1}</span>/{questions.length}</span>
          </div>
        </div>

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
    </main>
  );
}