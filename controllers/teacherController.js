// controllers/teacherController.js
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');                // ✅ use Op from here
const { sequelize } = require('../config/sequelize');
const User = require('../models/user');
const Teacher = require('../models/teacher');
const Student = require('../models/student');

// Admin creates teacher
exports.createTeacher = async (req, res) => {
  try {
    const { username, email, password, subject } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password required' });
    }
    const emailLc = email.toLowerCase();

    const existing = await User.findOne({
      where: { [Op.or]: [{ email: emailLc }, { username }] }
    });
    if (existing) return res.status(409).json({ error: 'Username or email already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const result = await sequelize.transaction(async (t) => {
      const user = await User.create(
        { username, email: emailLc, password: hashed, role: 'teacher' },
        { transaction: t }
      );
      const teacher = await Teacher.create(
        { userId: user.id, subject },
        { transaction: t }
      );
      return {
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        teacher: { id: teacher.id, userId: teacher.userId, subject: teacher.subject }
      };
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create teacher', details: err.message });
  }
};

// All teachers with students + user info (ordered, lean attributes)
exports.getAllTeachers = async (_req, res) => {
  try {
    const teachers = await Teacher.findAll({
      order: [['id', 'ASC']],                                    // ✅ predictable order
      attributes: ['id', 'userId', 'subject', 'createdAt'],      // ✅ avoid oversized payloads
      include: [
        { model: User, as: 'user', attributes: ['username', 'email', 'role'] },
        { model: Student, as: 'students', attributes: ['id', 'disability', 'learningStyle'] }
      ]
    });
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teachers', details: err.message });
  }
};

// Get one teacher
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id, {
      attributes: ['id', 'userId', 'subject', 'createdAt'],
      include: [
        { model: User, as: 'user', attributes: ['username', 'email', 'role'] },
        { model: Student, as: 'students', attributes: ['id', 'disability', 'learningStyle'] }
      ]
    });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teacher', details: err.message });
  }
};

// Update subject
exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    if (typeof req.body.subject === 'string') {
      teacher.subject = req.body.subject.trim();
    }
    await teacher.save();

    res.json({ id: teacher.id, userId: teacher.userId, subject: teacher.subject });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update teacher', details: err.message });
  }
};

// Delete teacher + user (transactional)
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    await sequelize.transaction(async (t) => {
      const user = await User.findByPk(teacher.userId, { transaction: t });
      await teacher.destroy({ transaction: t });
      if (user) await user.destroy({ transaction: t });
    });

    res.json({ message: 'Teacher and user deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete teacher', details: err.message });
  }
};

// Logged-in teacher creates a student
exports.createStudentUnderLoggedInTeacher = async (req, res) => {
  try {
    const { username, email, password, disability, learningStyle } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

    const emailLc = email.toLowerCase();
    const usernameTrim = username.trim();

    // Check duplicates
    const dup = await User.findOne({
      where: { [Op.or]: [{ email: emailLc }, { username: usernameTrim }] }
    });
    if (dup) {
      const field = dup.email === emailLc ? 'email' : 'username';
      return res.status(409).json({ error: `Duplicate ${field}`, field });
    }

    // Ensure teacher profile exists
    const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });

    // Create User + Student atomically
    const result = await sequelize.transaction(async (t) => {
      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create(
        { username: usernameTrim, email: emailLc, password: hashed, role: 'student' },
        { transaction: t }
      );
      const student = await Student.create(
        { userId: user.id, teacherId: teacher.id, disability, learningStyle },
        { transaction: t }
      );
      return {
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
        student: { id: student.id, userId: student.userId, teacherId: student.teacherId, disability, learningStyle }
      };
    });

    // Non-blocking notification
    try {
      const Notification = require('../models/notification');
      await Notification.create({ message: `👶 New student "${usernameTrim}" added`, recipientId: req.user.id });
    } catch (e) {
      console.warn('[notification.create] skipped:', e?.message);
    }

    res.status(201).json(result);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      const fields = err?.errors?.map(e => e.path) || [];
      return res.status(409).json({ error: 'Duplicate value', fields });
    }
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    console.error('[teacher.createStudentUnderLoggedInTeacher]', err);
    res.status(500).json({ error: 'Failed to create student under teacher', details: err.message });
  }
};
