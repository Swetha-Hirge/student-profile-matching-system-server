// controllers/recommendationController.js
const { Op } = require('sequelize');
const Recommendation = require('../models/recommendation');
const Student = require('../models/student');
const Activity = require('../models/activity');
const Teacher = require('../models/teacher');
const User = require('../models/user');

async function teacherOwnsStudent(reqUserId, studentId) {
  const teacher = await Teacher.findOne({ where: { userId: reqUserId } });
  if (!teacher) return { ok: false, code: 404, msg: 'Teacher profile not found' };
  const student = await Student.findByPk(studentId);
  if (!student) return { ok: false, code: 404, msg: 'Student not found' };
  if (student.teacherId !== teacher.id) return { ok: false, code: 403, msg: 'Forbidden: not your student' };
  return { ok: true, teacher, student };
}

// POST /api/recommendations  (teacher/admin)
exports.createRecommendation = async (req, res) => {
  try {
    const { studentId, activityId, score } = req.body;
    if (!studentId || !activityId || typeof score !== 'number')
      return res.status(400).json({ error: 'studentId, activityId and numeric score are required' });

    // scope: teachers can only act on their own students
    if (req.user.role === 'teacher') {
      const gate = await teacherOwnsStudent(req.user.id, studentId);
      if (!gate.ok) return res.status(gate.code).json({ error: gate.msg });
    } else {
      // admin path still validates existence
      const s = await Student.findByPk(studentId);
      if (!s) return res.status(404).json({ error: 'Student not found' });
    }

    const act = await Activity.findByPk(activityId);
    if (!act) return res.status(404).json({ error: 'Activity not found' });

    const rec = await Recommendation.create({ studentId, activityId, score });
    return res.status(201).json(rec);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Recommendation already exists for this student & activity' });
    }
    res.status(500).json({ error: 'Failed to create recommendation', details: error.message });
  }
};

// GET /api/recommendations?studentId=&limit=&offset=&order=&dir=
exports.getAllRecommendations = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? '25', 10), 1), 100);
    const offset = Math.max(parseInt(req.query.offset ?? '0', 10), 0);
    const order = (req.query.order ?? 'id').toString();
    const dir = (req.query.dir ?? 'DESC').toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const where = {};
    if (req.query.studentId) where.studentId = parseInt(req.query.studentId, 10);

    // teachers only see their own students' recommendations
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });
      // filter by students under this teacher
      const myStudentIds = (await Student.findAll({ where: { teacherId: teacher.id }, attributes: ['id'] }))
        .map(s => s.id);
      where.studentId = where.studentId
        ? { [Op.and]: [where.studentId, { [Op.in]: myStudentIds }] }
        : { [Op.in]: myStudentIds };
    }

    const { rows, count } = await Recommendation.findAndCountAll({
      where,
      order: [[order, dir]],
      limit,
      offset,
      include: [
        { model: Student, as: 'student', attributes: ['id', 'disability', 'learningStyle'],
          include: [{ model: User, as: 'user', attributes: ['username', 'email'] }] },
        { model: Activity, as: 'activity', attributes: ['id', 'title', 'difficulty', 'modality'] }
      ]
    });
    res.json({ data: rows, meta: { total: count, limit, offset, order, dir, hasMore: offset + rows.length < count } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recommendations', details: error.message });
  }
};

// GET /api/recommendations/:id
exports.getRecommendationById = async (req, res) => {
  try {
    const rec = await Recommendation.findByPk(req.params.id, {
      include: [
        { model: Student, as: 'student', attributes: ['id', 'disability', 'learningStyle'],
          include: [{ model: User, as: 'user', attributes: ['username', 'email'] }] },
        { model: Activity, as: 'activity', attributes: ['id', 'title', 'difficulty', 'modality'] }
      ]
    });
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    // teacher scope check
    if (req.user.role === 'teacher') {
      const ok = await teacherOwnsStudent(req.user.id, rec.studentId);
      if (!ok.ok) return res.status(ok.code).json({ error: ok.msg });
    }

    res.json(rec);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recommendation', details: error.message });
  }
};

// PUT /api/recommendations/:id  (teacher can only update own students)
exports.updateRecommendation = async (req, res) => {
  try {
    const { score } = req.body;
    const rec = await Recommendation.findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    if (req.user.role === 'teacher') {
      const ok = await teacherOwnsStudent(req.user.id, rec.studentId);
      if (!ok.ok) return res.status(ok.code).json({ error: ok.msg });
    }
    if (typeof score !== 'number') return res.status(400).json({ error: 'score must be a number (0..1)' });

    rec.score = score;
    await rec.save();
    res.json(rec);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recommendation', details: error.message });
  }
};

// DELETE /api/recommendations/:id  (teacher can only delete own students)
exports.deleteRecommendation = async (req, res) => {
  try {
    const rec = await Recommendation.findByPk(req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    if (req.user.role === 'teacher') {
      const ok = await teacherOwnsStudent(req.user.id, rec.studentId);
      if (!ok.ok) return res.status(ok.code).json({ error: ok.msg });
    }

    await rec.destroy();
    res.json({ message: 'Recommendation deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recommendation', details: error.message });
  }
};



// routes/recommendationRoutes.js

// controllers/recommendationController.js
exports.listRecommendations = async (req, res) => {
  const { mine, limit = 20, offset = 0, order = 'id', dir = 'DESC' } = req.query;
  const where = {};
  if (mine && req.user.role === 'student') {
    const Student = require('../models/student');
    const me = await Student.findOne({ where: { userId: req.user.id } });
    if (!me) return res.status(404).json({ error: 'Student profile not found' });
    where.studentId = me.id;
  }
  const Recommendation = require('../models/recommendation');
  const Activity = require('../models/activity');

  const rows = await Recommendation.findAll({
    where,
    include: [{ model: Activity, attributes: ['id','title'] }],
    order: [[order, String(dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC']],
    limit: Math.min(+limit || 20, 100),
    offset: Math.max(+offset || 0, 0),
  });
  res.json({ data: rows });
};
