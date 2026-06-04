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
 */
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { apiService } from '../services/apiService';

export default function ExamPage() {
  // Lấy courseId từ URL params
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [exam, setExam] = useState(null);           // Thông tin đề thi
  const [questions, setQuestions] = useState([]);   // Danh sách câu hỏi
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Câu hiện tại
  const [answers, setAnswers] = useState({});       // Các đáp án đã chọn {questionId: answerId}
  const [timeLeft, setTimeLeft] = useState(45 * 60); // Thời gian còn lại (giây)
  const [submitted, setSubmitted] = useState(false); // Đã nộp bài chưa
  const [result, setResult] = useState(null);       // Kết quả sau khi nộp
  const [loading, setLoading] = useState(true);     // Đang tải dữ liệu
  const [correctAnswers, setCorrectAnswers] = useState({}); // {questionId: correctAnswerId}

  // Refs để truy cập DOM elements an toàn trong React
  const questionElRef = useRef(null);        // Element hiển thị câu hỏi
  const answersElRef = useRef(null);         // Element hiển thị các đáp án
  const questionListInnerRef = useRef(null); // Element danh sách câu hỏi
  const timerElRef = useRef(null);           // Element hiển thị thời gian
  const questionCountElRef = useRef(null);   // Element hiển thị số câu
  const explanationElRef = useRef(null);     // Element hiển thị giải thích

  // Compute current question (must be before useEffects that use it)
  const currentQuestion = questions[currentQuestionIndex];

  // Load exam data from API
  useEffect(() => {
    const loadExam = async () => {
      console.log('Loading exam for courseId:', courseId);
      try {
        const data = await apiService.getExam(courseId);
        console.log('Exam data received:', data);
        
        const examData = data.exam;
        setExam(examData);
        setQuestions(examData.data || []);
        
        // Initialize answers object and store correct answers
        const initialAnswers = {};
        const correct = {};
        if (examData.data && Array.isArray(examData.data)) {
          examData.data.forEach((q) => {
            initialAnswers[q.id] = null;
            const correctAns = q.answers.find(a => a.is_correct);
            if (correctAns) {
              correct[q.id] = correctAns.id;
            }
          });
        }
        setAnswers(initialAnswers);
        setCorrectAnswers(correct);
      } catch (error) {
        console.error('Failed to load exam:', error);
        alert('Không thể tải đề thi. Vui lòng kiểm tra kết nối hoặc thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    loadExam();
  }, [courseId]);

  // Timer effect
  useEffect(() => {
    if (!submitted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (timeLeft === 0 && !submitted) {
      handleSubmit();
    }
  }, [timeLeft, submitted]);

  // Update timer display
  useEffect(() => {
    if (timerElRef.current) {
      timerElRef.current.textContent = formatTime(timeLeft);
    }
  }, [timeLeft]);

  // Update question count display
  useEffect(() => {
    if (questionCountElRef.current) {
      questionCountElRef.current.textContent = currentQuestionIndex + 1;
    }
  }, [currentQuestionIndex]);

  // Render question list
  useEffect(() => {
    if (!questions.length || !questionListInnerRef.current) return;

    questionListInnerRef.current.innerHTML = '';
    
    questions.forEach((q, index) => {
      const button = document.createElement('button');
      let bgClass;
      if (submitted) {
        const userAnswer = answers[q.id];
        const correctId = correctAnswers[q.id];
        if (!userAnswer) {
          bgClass = 'bg-slate-200 text-slate-500';
        } else if (Number(userAnswer) === Number(correctId)) {
          bgClass = 'bg-blue-600 text-white';
        } else {
          bgClass = 'bg-red-500 text-white';
        }
      } else {
        bgClass = index === currentQuestionIndex
          ? 'bg-sky-600 text-white'
          : answers[q.id] !== null
          ? 'bg-green-100 text-green-900 border border-green-300'
          : 'bg-slate-100 text-slate-700 border border-slate-200';
      }
      button.className = `w-10 h-10 flex items-center justify-center rounded-2xl font-semibold text-sm transition ${bgClass}`;
      // Mark current item for scrolling
      if (index === currentQuestionIndex) {
        button.dataset.current = 'true';
      }
      button.textContent = index + 1;
      button.onclick = () => handleGoToQuestion(index);
      questionListInnerRef.current.appendChild(button);
    });
    
    // Auto-scroll to current question
    const currentBtn = questionListInnerRef.current.querySelector('[data-current="true"]');
    if (currentBtn) {
      currentBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentQuestionIndex, answers, questions, submitted, correctAnswers]);

  // Render current question and answers
  useEffect(() => {
    if (!currentQuestion || !questionElRef.current || !answersElRef.current) return;

    // Show question content
    questionElRef.current.innerHTML = `<span class="text-slate-900">${currentQuestionIndex + 1}. </span><span class="text-slate-900">${currentQuestion.content}</span>`;
    
    // Show explanation if submitted
    if (submitted && explanationElRef.current) {
      const contentParts = currentQuestion.content.split('\n\n');
      const explanationText = contentParts.length > 1 ? contentParts.slice(1).join('\n\n') : null;
      if (explanationText) {
        const correctAns = currentQuestion.answers.find(a => a.is_correct);
        const isCorrect = correctAns && Number(correctAns.id) === Number(answers[currentQuestion.id]);
        explanationElRef.current.innerHTML = `
          <div class="mt-4 rounded-2xl border ${isCorrect ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'} p-4">
            <p class="text-sm font-semibold ${isCorrect ? 'text-blue-700' : 'text-red-700'}">💡 Giải thích:</p>
            <p class="mt-2 text-sm ${isCorrect ? 'text-blue-600' : 'text-red-600'} leading-relaxed">${explanationText}</p>
          </div>
        `;
        explanationElRef.current.className = 'block';
      } else {
        explanationElRef.current.className = 'hidden';
      }
    } else if (explanationElRef.current) {
      explanationElRef.current.className = 'hidden';
    }
    
    answersElRef.current.innerHTML = '';
    
    if (currentQuestion.answers && Array.isArray(currentQuestion.answers)) {
      currentQuestion.answers.forEach((answer) => {
        if (submitted) {
          // After submit - show colored result
          const isUserAnswer = Number(answers[currentQuestion.id]) === Number(answer.id);
          const isCorrectAnswer = answer.is_correct;
          let bgClass, borderClass, textClass;
          if (isCorrectAnswer) {
            bgClass = 'bg-blue-50';
            borderClass = 'border-blue-400';
            textClass = 'text-blue-800';
          } else if (isUserAnswer && !isCorrectAnswer) {
            bgClass = 'bg-red-50';
            borderClass = 'border-red-400';
            textClass = 'text-red-800';
          } else {
            bgClass = 'bg-white';
            borderClass = 'border-slate-200';
            textClass = 'text-slate-600';
          }
          const div = document.createElement('div');
          div.className = `flex items-center gap-3 rounded-3xl border ${borderClass} ${bgClass} p-4 ${textClass}`;
          const icon = document.createElement('span');
          if (isCorrectAnswer) {
            icon.textContent = '✓';
            icon.className = 'text-blue-600 font-bold text-lg';
          } else if (isUserAnswer) {
            icon.textContent = '✗';
            icon.className = 'text-red-600 font-bold text-lg';
          } else {
            icon.textContent = '';
            icon.className = 'w-5';
          }
          const span = document.createElement('span');
          span.className = textClass;
          span.textContent = answer.answer_text;
          div.appendChild(icon);
          div.appendChild(span);
          answersElRef.current.appendChild(div);
        } else {
          // Before submit - selectable radio
          const label = document.createElement('label');
          label.className = 'flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 cursor-pointer transition hover:border-sky-300 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50';
          
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = `question-${currentQuestion.id}`;
          input.value = answer.id;
          input.checked = answers[currentQuestion.id] === answer.id;
          input.onchange = () => handleAnswerSelect(answer.id);
          input.disabled = submitted;
          
          const span = document.createElement('span');
          span.className = 'text-slate-700';
          span.textContent = answer.answer_text;
          
          label.appendChild(input);
          label.appendChild(span);
          answersElRef.current.appendChild(label);
        }
      });
    }
  }, [currentQuestionIndex, answers, submitted, currentQuestion, correctAnswers]);

  // Update navigation button handlers
  useEffect(() => {
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');

    if (prevBtn) prevBtn.onclick = handlePrev;
    if (nextBtn) nextBtn.onclick = handleNext;
  }, [currentQuestionIndex]);

  // Show result when submitted
  useEffect(() => {
    if (result) {
      const resultPanel = document.getElementById('result-panel');
      const resultScore = document.getElementById('result-score');
      const resultDetails = document.getElementById('result-details');
      
      if (resultPanel) resultPanel.classList.remove('hidden');
      if (resultScore) resultScore.textContent = `${result.score}%`;
      if (resultDetails) {
        resultDetails.innerHTML = `
          <p>Số câu trả lời đúng: ${result.correctCount}/${result.totalQuestions}</p>
          <p>Kết quả: <strong>${result.passed ? '✓ Đạt' : '✗ Không đạt'}</strong></p>
        `;
      }
    }
  }, [result]);

  if (loading) return <div className="flex justify-center items-center min-h-screen">Đang tải...</div>;
  if (!exam) return <div className="flex justify-center items-center min-h-screen">Không tìm thấy đề thi</div>;

  
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function handleAnswerSelect(answerId) {
    if (!submitted) {
      setAnswers({
        ...answers,
        [currentQuestion.id]: answerId
      });
    }
  }

  function handleNext() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }

  function handlePrev() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }

  function handleGoToQuestion(index) {
    setCurrentQuestionIndex(index);
  }

  async function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    try {
      const answersArray = questions.map(q => ({
        questionId: q.id,
        answerId: answers[q.id]
      }));
      const resultData = await apiService.submitExam(courseId, answersArray, 1);
      setResult(resultData);
    } catch (error) {
      console.error('Failed to submit exam:', error);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">{exam.title}</h1>
        <p className="mt-3 text-sm text-slate-600">Chuẩn bị sẵn sàng để hoàn thành bài thi thử với các câu hỏi trắc nghiệm.</p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={() => navigate('/dashboard')} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Quay lại Dashboard
          </button>
        </div>
          <div id="result-panel" className="hidden rounded-3xl border border-amber-200 bg-amber-50 p-5 text-slate-900 shadow-sm" role="status">
            <div className="text-lg font-semibold text-amber-900"><span id="result-title">Kết quả: </span><span id="result-score"></span></div>
            <div id="result-details" className="mt-2 text-sm text-amber-900"></div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
              <div className="text-base font-semibold text-red-600">Thời gian: <span ref={timerElRef} className="font-mono">45:00</span></div>
              {!submitted && (
                <button onClick={handleSubmit} className="inline-flex items-center justify-center rounded-3xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/10 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500">Nộp bài</button>
              )}
          </div>

          {/* Chú thích trạng thái sau khi nộp */}
          {submitted && (
          <div className="flex items-center gap-6 text-xs text-slate-500 px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Trả lời đúng</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>Trả lời sai</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300"></span>
              <span>Chưa trả lời</span>
            </div>
          </div>
          )}

          <div id="question-list" className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div ref={questionListInnerRef} id="question-list-inner" className="min-w-[500px] flex flex-wrap items-center gap-3"></div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Danh sách câu hỏi</span>
              <span className="font-semibold text-slate-500">Câu <span ref={questionCountElRef} className="font-bold text-slate-900">1</span>/{questions.length}</span>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.15)]">
            <div ref={questionElRef} id="question" className="mb-5 text-lg font-semibold leading-8 text-slate-900" aria-live="polite"></div>
            <div ref={answersElRef} id="answers" className="space-y-3"></div>
            <div ref={explanationElRef} id="explanation" className="hidden"></div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button id="prev" className="inline-flex items-center justify-center rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500">Câu trước</button>
              <button id="next" className="inline-flex items-center justify-center rounded-3xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/10 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500">Câu tiếp</button>
            </div>
          </div>
      </div>
    </main>
  );
}