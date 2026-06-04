// Simple test script to verify API endpoints
const API_BASE = 'http://localhost:4000';

async function testAPI() {
  console.log('🧪 Testing API endpoints...\n');

  try {
    // Test 1: Get courses list
    console.log('📋 Test 1: Getting courses list...');
    const coursesRes = await fetch(`${API_BASE}/courses`);
    const coursesData = await coursesRes.json();
    console.log('   Courses:', coursesData.items?.length || 0);
    if (coursesData.items && coursesData.items.length > 0) {
      console.log('   ✓ Courses endpoint working');
      console.log('   Sample course:', coursesData.items[0].title);
    } else {
      console.log('   ⚠ No courses found in database');
    }

    // Test 2: Get course detail with questions
    if (coursesData.items && coursesData.items.length > 0) {
      const courseId = coursesData.items[0].id;
      console.log(`\n📖 Test 2: Getting course detail (ID: ${courseId})...`);
      const courseRes = await fetch(`${API_BASE}/courses/${courseId}`);
      const courseData = await courseRes.json();
      console.log('   Course:', courseData.course?.title);
      console.log('   Questions:', courseData.course?.questions?.length || 0);
      if (courseData.course?.questions?.length > 0) {
        console.log('   ✓ Course detail endpoint working');
      } else {
        console.log('   ⚠ No questions found for this course');
      }

      // Test 3: Get exam data
      console.log(`\n📝 Test 3: Getting exam data (ID: ${courseId})...`);
      const examRes = await fetch(`${API_BASE}/exams/${courseId}`);
      const examData = await examRes.json();
      console.log('   Exam title:', examData.exam?.title);
      console.log('   Total questions:', examData.exam?.data?.length || 0);
      if (examData.exam?.data?.length > 0) {
        console.log('   ✓ Exam endpoint working');
      }

      // Test 4: Submit exam (simulate)
      if (examData.exam?.data?.length > 0) {
        console.log('\n✍️  Test 4: Submitting exam...');
        const questions = examData.exam.data;
        const answers = questions.map(q => ({
          questionId: q.id,
          answerId: q.answers[0]?.id // Just pick first answer for test
        }));
        
        const submitRes = await fetch(`${API_BASE}/exams/${courseId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, userId: 1 })
        });
        const submitData = await submitRes.json();
        console.log('   Score:', submitData.score + '%');
        console.log('   Correct:', submitData.correctCount + '/' + submitData.totalQuestions);
        console.log('   Passed:', submitData.passed ? '✓' : '✗');
        console.log('   ✓ Exam submission endpoint working');
      }
    }

    console.log('\n✅ All API tests completed!');
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  }
}

// Run tests
testAPI();