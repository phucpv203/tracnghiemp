/**
 * StudyPage - Trang học tập với câu hỏi trắc nghiệm
 * 
 * Chức năng chính:
 * - Hiển thị câu hỏi từ database theo courseId
 * - Cho phép người dùng chọn đáp án và kiểm tra ngay lập tức
 * - Theo dõi tiến độ học tập
 * - Lưu tiến độ vào localStorage để không mất khi tải lại trang
 * - Lưu vị trí câu hỏi hiện tại, khi vào lại sẽ trỏ đến câu đang học dở
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
  const [initialIndexLoaded, setInitialIndexLoaded] = useState(false); // Đã khôi phục index từ localStorage chưa
  const [wrongAnswerMode, setWrongAnswerMode] = useState(false); // Chế độ luyện câu sai
  const [wrongQuestions, setWrongQuestions] = useState([]); // Danh sách câu hỏi sai khi lọc

  // Compute current question (must be before useEffects that use it)
  const currentQuestion = wrongAnswerMode ? wrongQuestions[currentQuestionIndex] : questions[currentQuestionIndex];

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
        if (error.code === 'COURSE_LOCKED') {
          alert(error.message);
          navigate('/trang-chu');
        } else {
          alert('Không thể tải dữ liệu học tập. Vui lòng kiểm tra kết nối hoặc thử lại sau.');
        }
      }
    };
    loadStudyData();
  }, [courseId]);

  // Load answers & last question index from localStorage
  useEffect(() => {
    const savedAnswers = localStorage.getItem(`study_answers_${courseId}`);
    if (savedAnswers) {
      setAnsweredQuestions(JSON.parse(savedAnswers));
    }
    const savedIndex = localStorage.getItem(`study_index_${courseId}`);
    if (savedIndex !== null) {
      const idx = parseInt(savedIndex, 10);
      if (!isNaN(idx)) {
        setCurrentQuestionIndex(idx);
      }
    }
    setInitialIndexLoaded(true);
  }, [courseId]);

  // Sau khi khôi phục index và câu hỏi đã tải xong, khôi phục trạng thái của câu đó
  useEffect(() => {
    if (!initialIndexLoaded || !questions.length || !currentQuestion) return;
    
    const answeredData = answeredQuestions[currentQuestion.id];
    if (answeredData) {
      setSelectedAnswer(answeredData.selected);
      setShowExplanation(true);
    } else {
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  }, [initialIndexLoaded, questions, currentQuestion?.id]);

  // Update DOM elements for question list (horizontal scrollable display)
  useEffect(() => {
    const questionListInner = document.getElementById('question-list-inner');
    const listQuestions = wrongAnswerMode ? wrongQuestions : questions;
    if (!questionListInner || !listQuestions.length) return;

    questionListInner.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'flex gap-2';
    listQuestions.forEach((q, index) => {
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
      
      // Question number badge
      const numberBadge = document.createElement('span');
      numberBadge.className = `w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${badgeClass}`;
      numberBadge.textContent = index + 1;
      
      // Mark current item with data attribute for scrolling
      if (index === currentQuestionIndex) {
        item.dataset.current = 'true';
      }
      item.appendChild(numberBadge);
      const questionId = q.id;
      item.onclick = () => handleGoToQuestion(index, questionId);
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
  }, [questions, wrongQuestions, currentQuestionIndex, answeredQuestions, wrongAnswerMode]);

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
      questionEl.innerHTML = `<span class="text-slate-900 dark:text-slate-100">${currentQuestionIndex + 1}. </span><span class="text-slate-900 dark:text-slate-100">${questionText}</span>`;
    }

    // Show/hide explanation
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
              btn.className += ' bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
            } else if (Number(answer.id) === Number(selectedAnswer) && selectedAnswer !== null) {
              // User's wrong selection: red
              btn.className += ' bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
            } else {
              // Other answers: white
              btn.className += ' bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400';
            }
          } else {
            // Not answered yet -> allow selecting
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
        // Sử dụng shuffledAnswersMap để lấy chữ cái đáp án đúng theo thứ tự hiển thị
        const displayAnswers = shuffledAnswersMap[currentQuestion.id] || currentQuestion.answers;
        const correctDisplayIndex = displayAnswers.findIndex(a => a.is_correct);
        resultEl.innerHTML = `
          <span class="${isCorrect ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'} font-semibold">
            ${isCorrect ? '✓ Chính xác!' : '✗ Sai rồi!'} 
            ${!isCorrect && correctDisplayIndex !== -1 ? `Đáp án đúng: ${String.fromCharCode(65 + correctDisplayIndex)}` : ''}
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
      
      // 1, 2, 3, 4, 5 -> select answer by index (theo thứ tự hiển thị đã xáo trộn)
      if (!showExplanation && currentQuestion && currentQuestion.answers) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 5) {
          const answerIndex = num - 1;
          // Sử dụng shuffledAnswersMap để lấy đáp án theo đúng thứ tự hiển thị
          const displayAnswers = shuffledAnswersMap[currentQuestion.id] || currentQuestion.answers;
          if (answerIndex < displayAnswers.length) {
            e.preventDefault();
            const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
            handleAnswerClick(displayAnswers[answerIndex].id, correctAnswer);
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
    const listLength = wrongAnswerMode ? wrongQuestions.length : questions.length;

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
      nextBtn.disabled = currentQuestionIndex === listLength - 1;
      nextBtn.className = `inline-flex items-center justify-center rounded-3xl px-4 py-3 text-sm font-semibold shadow-lg shadow-sky-500/10 transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
        currentQuestionIndex === listLength - 1
          ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
          : 'bg-sky-600 text-white hover:bg-sky-700'
      }`;
    }
  }, [currentQuestionIndex, questions.length, wrongQuestions.length, wrongAnswerMode]);

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
    const listQuestions = wrongAnswerMode ? wrongQuestions : questions;
    if (currentQuestionIndex < listQuestions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      localStorage.setItem(`study_index_${courseId}`, nextIndex);
      const nextQuestion = listQuestions[nextIndex];
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
      localStorage.setItem(`study_index_${courseId}`, prevIndex);
      const listQuestions = wrongAnswerMode ? wrongQuestions : questions;
      const prevQuestion = listQuestions[prevIndex];
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
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setWrongAnswerMode(false);
    setWrongQuestions([]);
    localStorage.removeItem(`study_answers_${courseId}`);
    localStorage.removeItem(`study_index_${courseId}`);
  };

  const handleWrongAnswerPractice = () => {
    // Lọc ra các câu trả lời sai
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
    // Khôi phục index đã lưu
    const savedIndex = localStorage.getItem(`study_index_${courseId}`);
    if (savedIndex !== null) {
      const idx = parseInt(savedIndex, 10);
      if (!isNaN(idx)) {
        setCurrentQuestionIndex(idx);
      }
    }
  };

  const handleGoToQuestion = (index, questionId) => {
    setCurrentQuestionIndex(index);
    localStorage.setItem(`study_index_${courseId}`, index);
    
    // Check if this question was already answered
    const listQuestions = wrongAnswerMode ? wrongQuestions : questions;
    const question = listQuestions[index];
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
          {course.description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{course.description}</p>
          )}
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Ôn tập lại nội dung quan trọng và xem lại cấu trúc đề.</p>
        </div>
        <button onClick={() => navigate('/trang-chu')} className="rounded-2xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:hover:bg-slate-600">
          Quay lại Trang chủ
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex justify-end gap-3">
          {wrongAnswerMode && (
            <button
              onClick={handleBackToNormalStudy}
              className="rounded-3xl border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 px-5 py-3 text-sm font-semibold text-orange-700 dark:text-orange-300 shadow-sm transition hover:bg-orange-100 dark:hover:bg-orange-900/30 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              ← Về ôn tập
            </button>
          )}
          {!wrongAnswerMode && (
            <button 
              onClick={handleWrongAnswerPractice}
              className="rounded-3xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 px-5 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300 shadow-sm transition hover:bg-rose-100 dark:hover:bg-rose-900/30 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              Luyện câu sai
            </button>
          )}
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
                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                <span>Chưa trả lời</span>
              </div>
            </div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">Câu <span className="font-bold text-slate-900 dark:text-slate-100">{currentQuestionIndex + 1}</span>/{wrongAnswerMode ? wrongQuestions.length : questions.length}</span>
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