// server/controllers/feedbackController.js
const { Op, fn, col, literal } = require('sequelize');
const Feedback = require('../models/feedback');         // assumes: id, recommendationId, studentId, rating, helpful, comment, difficulty
const Recommendation = require('../models/recommendation');
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Activity = require('../models/activity');
// const { Feedback, Recommendation, Student } = require('../models'); 

// POST /api/recommendations/:id/feedback  (student only)
exports.createFeedback = async (req, res) => {
  try {
    const recId = Number(req.params.id);
    if (!Number.isInteger(recId)) {
      return res.status(400).json({ error: 'Invalid recommendation id' });
    }

    // 1) recommendation exists?
    const rec = await Recommendation.findByPk(recId);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    // 2) find student profile for current user
    const me = await Student.findOne({ where: { userId: req.user.id } });
    if (!me) return res.status(404).json({ error: 'Student profile not found' });

    // 3) must own this recommendation
    if (rec.studentId !== me.id) {
      return res.status(403).json({ error: 'Forbidden: not your recommendation' });
    }

    // 4) prevent duplicate feedback
    const { rating, helpful, difficulty, comment } = req.body;
    const [fb, created] = await Feedback.findOrCreate({
      where: { recommendationId: rec.id, studentId: me.id },
      defaults: {
        rating: typeof rating === 'number' ? rating : null,
        helpful: typeof helpful === 'boolean' ? helpful : null,
        difficulty: difficulty || null,
        comment: comment?.trim() || null,
      },
    });

    // If already existed, maybe update instead of reject
    if (!created) {
      fb.rating = rating ?? fb.rating;
      fb.helpful = helpful ?? fb.helpful;
      fb.difficulty = difficulty ?? fb.difficulty;
      fb.comment = comment ?? fb.comment;
      await fb.save();
    }

    return res.status(created ? 201 : 200).json({
      message: created ? 'Feedback saved' : 'Feedback updated',
      data: fb,
    });
  } catch (err) {
    console.error('[feedback.create]', err);
    return res.status(500).json({ error: 'Failed to save feedback', details: err.message });
  }
};


exports.createOrUpdateMine = async (req, res) => {
  try {
    const recId = Number(req.params.id);
    if (!Number.isInteger(recId)) return res.status(400).json({ error: 'Invalid recommendation id' });

    // find my student profile
    const me = await Student.findOne({ where: { userId: req.user.id } });
    if (!me) return res.status(404).json({ error: 'Student profile not found' });

    // recommendation must belong to me
    const rec = await Recommendation.findByPk(recId);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
    if (rec.studentId !== me.id) {
      return res.status(403).json({ error: 'Forbidden: not your recommendation' });
    }

    const { rating, helpful, comment, difficulty } = req.body;
    const payload = {
      rating: typeof rating === 'number' ? Math.max(1, Math.min(5, rating)) : null,
      helpful: typeof helpful === 'boolean' ? helpful : null,
      comment: typeof comment === 'string' ? comment.trim().slice(0, 500) : null,
      difficulty: typeof difficulty === 'string' ? difficulty.trim().slice(0, 32) : null,
    };

    // upsert on (recommendationId, studentId)
    const [fb, created] = await Feedback.findOrCreate({
      where: { recommendationId: recId, studentId: me.id },
      defaults: { recommendationId: recId, studentId: me.id, ...payload },
    });
    if (!created) {
      await fb.update(payload);
    }

    res.status(created ? 201 : 200).json({ message: created ? 'Feedback created' : 'Feedback updated', data: fb });
  } catch (err) {
    console.error('[feedback.createOrUpdateMine]', err);
    res.status(500).json({ error: 'Failed to save feedback', details: err.message });
  }
};

exports.getForRecommendation = async (req, res) => {
  try {
    const recId = Number(req.params.id);
    if (!Number.isInteger(recId)) return res.status(400).json({ error: 'Invalid recommendation id' });

    const rec = await Recommendation.findByPk(recId);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    // students can only see their own record
    if (req.user.role === 'student') {
      const me = await Student.findOne({ where: { userId: req.user.id } });
      if (!me) return res.status(404).json({ error: 'Student profile not found' });
      if (rec.studentId !== me.id) return res.status(403).json({ error: 'Forbidden' });

      const mine = await Feedback.findOne({ where: { recommendationId: recId, studentId: me.id } });
      return res.json({ data: mine ? [mine] : [] });
    }

    // teacher can only see feedback of their students
    if (req.user.role === 'teacher') {
      const t = await Teacher.findOne({ where: { userId: req.user.id } });
      if (!t) return res.status(404).json({ error: 'Teacher profile not found' });
      if (rec.studentId && rec.studentId !== t.id) {
        // rec.studentId stores Student.id, not Teacher.id; verify ownership through Student.teacherId
        const stu = await Student.findByPk(rec.studentId);
        if (!stu || stu.teacherId !== t.id) {
          return res.status(403).json({ error: 'Forbidden: not your student' });
        }
      }
    }

    // admin/teacher: list (simple pagination)
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? '50', 10), 1), 200);
    const offset = Math.max(parseInt(req.query.offset ?? '0', 10), 0);

    const list = await Feedback.findAll({
      where: { recommendationId: recId },
      order: [['updatedAt', 'DESC']],
      limit,
      offset,
    });

    res.json({ data: list, meta: { limit, offset, count: list.length } });
  } catch (err) {
    console.error('[feedback.getForRecommendation]', err);
    res.status(500).json({ error: 'Failed to fetch feedback', details: err.message });
  }
};

exports.activitySummary = async (req, res) => {
  try {
    const activityId = Number(req.params.activityId);
    if (!Number.isInteger(activityId)) return res.status(400).json({ error: 'Invalid activity id' });

    const exists = await Activity.findByPk(activityId);
    if (!exists) return res.status(404).json({ error: 'Activity not found' });

    // join Feedback → Recommendation to filter by activityId
    const rows = await Feedback.findAll({
      attributes: [
        [fn('COUNT', col('Feedback.id')), 'count'],
        [fn('AVG', col('Feedback.rating')), 'avgRating'],
        [literal(`AVG(CASE WHEN "Feedback"."helpful" = true THEN 1 ELSE 0 END)`), 'helpfulPct'],
      ],
      include: [{ model: Recommendation, attributes: [], where: { activityId } }],
      raw: true,
    });

    const agg = rows?.[0] || { count: 0, avgRating: null, helpfulPct: null };
    res.json({
      data: {
        count: Number(agg.count || 0),
        avgRating: agg.avgRating !== null ? Number(agg.avgRating).toFixed(2) : null,
        helpfulPct: agg.helpfulPct !== null ? Math.round(Number(agg.helpfulPct) * 100) : null,
      },
    });
  } catch (err) {
    console.error('[feedback.activitySummary]', err);
    res.status(500).json({ error: 'Failed to aggregate feedback', details: err.message });
  }
};
