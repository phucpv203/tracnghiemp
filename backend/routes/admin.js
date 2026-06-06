import { Router } from 'express';
import {
  listUsers,
  searchUsers,
  updateUser,
  deleteUser,
  getUserDevices,
  deleteUserDevice,
  listCourses,
  searchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  addQuestion,
  updateQuestion,
  updateUserProgress,
  importQuestions,
} from '../services/adminService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Tất cả API admin đều cần đăng nhập + role admin
router.use(requireAuth, requireAdmin);

// Users
router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    let users;
    if (search && search.trim()) {
      users = await searchUsers(search.trim());
    } else {
      users = await listUsers();
    }
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const result = await deleteUser(req.params.id);
    if (!result) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Đã xoá người dùng thành công.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/users/:id/devices', async (req, res) => {
  try {
    const devices = await getUserDevices(req.params.id);
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/users/:id/devices/:deviceId', async (req, res) => {
  try {
    const result = await deleteUserDevice(req.params.id, req.params.deviceId);
    if (!result) return res.status(404).json({ message: 'Device not found' });
    res.json({ message: 'Đã xoá thiết bị thành công.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/users/:id/progress/:courseId', async (req, res) => {
  try {
    const updated = await updateUserProgress(req.params.id, req.params.courseId, req.body);
    if (!updated) return res.status(404).json({ message: 'Progress record not found' });
    res.json({ progress: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Courses
router.get('/courses', async (req, res) => {
  try {
    const { search } = req.query;
    let courses;
    if (search && search.trim()) {
      courses = await searchCourses(search.trim());
    } else {
      courses = await listCourses();
    }
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const course = await createCourse(req.body);
    res.status(201).json({ course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const course = await updateCourse(req.params.id, req.body);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const result = await deleteCourse(req.params.id);
    if (!result) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Đã xoá môn học thành công.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Questions
router.post('/questions', async (req, res) => {
  try {
    const q = await addQuestion(req.body);
    res.status(201).json({ question: q });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/questions/import', async (req, res) => {
  try {
    const { courseId, questions } = req.body;
    const imported = await importQuestions(courseId, questions);
    res.status(201).json({ imported });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/questions/:id', async (req, res) => {
  try {
    const q = await updateQuestion(req.params.id, req.body);
    if (!q) return res.status(404).json({ message: 'Question not found' });
    res.json({ question: q });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
