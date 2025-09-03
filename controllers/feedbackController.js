const Feedback = require('../models/feedback');
const Recommendation = require('../models/recommendation');

exports.getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findAll({ include: [Recommendation] });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
};

exports.createFeedback = async (req, res) => {
  try {
    const fb = await Feedback.create(req.body);
    res.status(201).json(fb);
  } catch (err) {
    res.status(400).json({ error: 'Invalid data' });
  }
};
