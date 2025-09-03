// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');                 // ✅ add
const User = require('../models/user');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

exports.register = async (req, res) => {
  try {
    const { name, username: rawUsername, email, password, role } = req.body;
    const username = (rawUsername || name || '').trim();
    const emailLc = email?.toLowerCase();

    if (!username || !emailLc || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const allowedRoles = ['student', 'teacher', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // ✅ check both username + email
    const dup = await User.findOne({
      where: { [Op.or]: [{ email: emailLc }, { username }] }
    });
    if (dup) {
      const field = dup.email === emailLc ? 'email' : 'username';
      return res.status(409).json({ error: `Duplicate ${field}`, field });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: emailLc,
      password: hashed,
      role,
    });

    return res.status(201).json({
      message: 'User registered',
      user: { id: user.id, username: user.username, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error('[auth.register]', err);
    // Map common Sequelize errors cleanly
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Duplicate value', fields: err.errors?.map(e => e.path) });
    }
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors?.map(e => ({ field: e.path, message: e.message })) });
    }
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const emailLc = req.body.email?.toLowerCase();
    const { password } = req.body;

    if (!emailLc || !password) return res.status(400).json({ error: 'Missing email or password' });

    const user = await User.findOne({ where: { email: emailLc } });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, cookieOpts); // httpOnly cookie

    res.json({
      message: 'Logged in',
      token, // also return for Bearer usage
      user: { id: user.id, username: user.username, role: user.role, email: user.email },
    });
  } catch (err) {
    console.error('[auth.login]', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

exports.logout = async (_req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: false });
  res.json({ message: 'Logged out' });
};
