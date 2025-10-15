// controllers/studentController.js
const { Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const Student = require('../models/student');
const User = require('../models/user');
const Teacher = require('../models/teacher');
const Recommendation = require('../models/recommendation');
const Activity = require('../models/activity');
const matchingEngine = require('../services/matchingEngine');

// ==============================
// GET /api/students
// ==============================
exports.getAllStudents = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? '25', 10), 1), 100);
    const offset = Math.max(parseInt(req.query.offset ?? '0', 10), 0);
    const q = (req.query.q ?? '').toString().trim();

    const include = [
      { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
      { model: Teacher, as: 'teacher', attributes: ['id', 'userId'] },
    ];

    const where = {};
    if (!isAdmin) {
      const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });
      where.teacherId = teacher.id;
    }

    if (q) {
      include[0].where = {
        [Op.or]: [
          { username: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%${q}%` } }
        ]
      };
      include[0].required = true;
    }

    const { rows, count } = await Student.findAndCountAll({
      where,
      include,
      order: [['id', 'ASC']],
      limit,
      offset
    });

    res.json({
      data: rows,
      meta: { total: count, limit, offset, hasMore: offset + rows.length < count }
    });
  } catch (err) {
    console.error('[students.getAll]', err);
    res.status(500).json({ error: 'Failed to fetch students', details: err.message });
  }
};

// ==============================
// GET /api/students/:id
// ==============================
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'email'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'userId'] }
      ]
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role === 'teacher') {
      const myTeacher = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!myTeacher) return res.status(404).json({ error: 'Teacher profile not found' });
      if (student.teacherId !== myTeacher.id) {
        return res.status(403).json({ error: 'Forbidden: not your student' });
      }
    }

    res.json(student);
  } catch (err) {
    console.error('[students.getById]', err);
    res.status(500).json({ error: 'Failed to fetch student', details: err.message });
  }
};

// ==============================
// PUT /api/students/:id
// ==============================
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role === 'teacher') {
      const myTeacher = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!myTeacher) return res.status(404).json({ error: 'Teacher profile not found' });
      if (student.teacherId !== myTeacher.id) {
        return res.status(403).json({ error: 'Forbidden: not your student' });
      }
    }

    const { disability, learningStyle } = req.body;
    if (typeof disability === 'string') student.disability = disability.trim();
    if (typeof learningStyle === 'string') student.learningStyle = learningStyle.trim();

    await student.save();
    res.json(student);
  } catch (err) {
    console.error('[students.update]', err);
    res.status(500).json({ error: 'Failed to update student', details: err.message });
  }
};

// ==============================
// DELETE /api/students/:id
// ==============================
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role === 'teacher') {
      const myTeacher = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!myTeacher) return res.status(404).json({ error: 'Teacher profile not found' });
      if (student.teacherId !== myTeacher.id) {
        return res.status(403).json({ error: 'Forbidden: not your student' });
      }
    }

    await sequelize.transaction(async (t) => {
      const user = await User.findByPk(student.userId, { transaction: t });
      await student.destroy({ transaction: t });
      if (user) await user.destroy({ transaction: t });
    });

    res.json({ message: 'Student and linked user deleted' });
  } catch (err) {
    console.error('[students.delete]', err);
    res.status(500).json({ error: 'Failed to delete student', details: err.message });
  }
};

// ==============================
// GET /api/students/:id/recommendations
// ==============================
exports.getRecommendationsForStudent = async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum)) {
      return res.status(400).json({ error: 'Invalid student id' });
    }

    const student = await Student.findByPk(idNum);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Student can only see their own recs
    if (req.user.role === 'student') {
      const me = await Student.findOne({ where: { userId: req.user.id } });
      if (!me) return res.status(404).json({ error: 'Student profile not found' });
      if (me.id !== student.id) {
        return res.status(403).json({ error: 'Forbidden: you can only view your own recommendations' });
      }
    }

    // Teacher can only see their students
    if (req.user.role === 'teacher') {
      const myTeacher = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!myTeacher) return res.status(404).json({ error: 'Teacher profile not found' });
      if (student.teacherId !== myTeacher.id) {
        return res.status(403).json({ error: 'Forbidden: not your student' });
      }
    }

    const matches = await matchingEngine.getRecommendedActivities(student);

    // Only return minimal info for students
    if (req.user.role === 'student') {
      return res.json(matches.map(m => ({
        activityId: m.activityId,
        score: m.score
      })));
    }

    res.json(matches);
  } catch (err) {
    console.error('[students.recommendations]', err);
    res.status(500).json({ error: 'Failed to generate recommendations', details: err.message });
  }
};

// ==============================
// POST /api/students/:id/recommendations
// ==============================
exports.generateAndSaveTopRecommendation = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role === 'teacher') {
      const myTeacher = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!myTeacher) return res.status(404).json({ error: 'Teacher profile not found' });
      if (student.teacherId !== myTeacher.id) {
        return res.status(403).json({ error: 'Forbidden: not your student' });
      }
    }

    const matches = await matchingEngine.getRecommendedActivities(student);
    if (!matches.length) return res.status(200).json({ message: 'No matching activities found.' });

    const topMatch = matches[0];
    const existing = await Recommendation.findOne({
      where: { studentId: student.id, activityId: topMatch.activityId }
    });
    if (existing) return res.status(409).json({ message: 'Recommendation already exists for this activity.' });

    const recommendation = await Recommendation.create({
      studentId: student.id,
      activityId: topMatch.activityId,
      score: topMatch.score
    });

    const activity = await Activity.findByPk(topMatch.activityId);

    res.status(201).json({
      message: 'Recommendation created successfully.',
      recommendation,
      matchedActivity: activity
    });
  } catch (err) {
    console.error('[students.createRecommendation]', err);
    res.status(500).json({ error: 'Failed to create recommendation', details: err.message });
  }
};

// ==============================
// GET /api/students/me/recommendations
// ==============================
exports.getMySavedRecommendationsMinimal = async (req, res) => {
  try {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const me = await Student.findOne({ where: { userId: req.user.id } });
    if (!me) return res.status(404).json({ error: 'Student profile not found' });

    const recs = await Recommendation.findAll({
      where: { studentId: me.id },
      include: [{ model: Activity, attributes: ['id', 'title'] }],
      order: [['score', 'DESC'], ['id', 'DESC']]
    });

    const data = recs.map(r => ({
      activityId: r.activityId,
      title: r.Activity?.title || undefined,
      score: r.score
    }));

    res.json({ data });
  } catch (err) {
    console.error('[students.meSavedRecsMinimal]', err);
    res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const me = await Student.findOne({
      where: { userId: req.user.id },
      include: [
        { model: require('../models/user'), as: 'user', attributes: ['id','username','email'] },
        { model: Teacher, as: 'teacher', attributes: ['id','userId'] },
      ],
      attributes: ['id','userId','teacherId','disability','learningStyle']
    });

    if (!me) return res.status(404).json({ error: 'Student profile not found' });
    return res.json({ data: me }); // { data: { id: <Student.id>, ... } }
  } catch (err) {
    console.error('[students.getMe]', err);
    return res.status(500).json({ error: 'Failed to fetch profile', details: err.message });
  }
};

/**
 * GET /api/students/:id/recommendations
 * Returns recommendations for a student.
 * Permissions:
 *  - student: only their own Student.id
 *  - teacher: only their students
 *  - admin: any
 * Response:
 *  - student: minimal array [{ activityId, score }]
 *  - teacher/admin: full matchingEngine output
 */
exports.getRecommendationsForStudent = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid student id' });
    }

    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (req.user.role === 'student') {
      const me = await Student.findOne({ where: { userId: req.user.id }, attributes: ['id'] });
      if (!me) return res.status(404).json({ error: 'Student profile not found' });
      if (me.id !== id) {
        return res.status(403).json({ error: 'Forbidden: you can only access your own recommendations' });
      }
    } else if (req.user.role === 'teacher') {
      const myTeacher = await Teacher.findOne({ where: { userId: req.user.id }, attributes: ['id'] });
      if (!myTeacher) return res.status(404).json({ error: 'Teacher profile not found' });
      if (student.teacherId !== myTeacher.id) {
        return res.status(403).json({ error: 'Forbidden: not your student' });
      }
    }
    // admin passes

    const matches = await matchingEngine.getRecommendedActivities(student);

    if (req.user.role === 'student') {
      // minimal payload for students
      return res.json(matches.map(m => ({
        activityId: m.activityId,
        score: m.score
      })));
    }

    // teacher/admin see full payload
    return res.json(matches);
  } catch (err) {
    console.error('[students.recommendations]', err);
    return res.status(500).json({ error: 'Failed to generate recommendations', details: err.message });
  }
};

/* Optional: already provided earlier, used by /api/students/me/recommendations */
exports.getMySavedRecommendationsMinimal = async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Forbidden' });
    const me = await Student.findOne({ where: { userId: req.user.id }, attributes: ['id'] });
    if (!me) return res.status(404).json({ error: 'Student profile not found' });

    const recs = await Recommendation.findAll({
      where: { studentId: me.id },
      include: [{ model: Activity, attributes: ['id','title'] }],
      order: [['score','DESC'], ['id','DESC']]
    });

    return res.json({
      data: recs.map(r => ({ activityId: r.activityId, title: r.Activity?.title, score: r.score }))
    });
  } catch (err) {
    console.error('[students.meSavedRecsMinimal]', err);
    return res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
};