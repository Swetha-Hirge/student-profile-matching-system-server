const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Notification = require('../models/notification');
const { Op } = require('sequelize');

// GET /api/notifications?isRead=false&limit=20&offset=0
router.get('/', verifyToken, async (req, res) => {
  try {
    const limit  = Math.min(Math.max(parseInt(req.query.limit ?? '20', 10), 1), 100);
    const offset = Math.max(parseInt(req.query.offset ?? '0', 10), 0);
    const isReadParam = req.query.isRead;
    const where = { recipientId: req.user.id };

    if (typeof isReadParam !== 'undefined') {
      where.isRead = String(isReadParam).toLowerCase() === 'true';
    }

    const { rows, count } = await Notification.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      data: rows,
      meta: { total: count, limit, offset, hasMore: offset + rows.length < count }
    });
  } catch (err) {
    console.error('[notifications.list]', err);
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

// POST /api/notifications/:id/read  (mark single as read)
router.post('/:id/read', verifyToken, async (req, res) => {
  try {
    const n = await Notification.findByPk(req.params.id);
    if (!n || n.recipientId !== req.user.id) {
      return res.status(404).json({ error: 'Not found or not yours' });
    }
    if (!n.isRead) {
      n.isRead = true;
      await n.save();
    }
    res.json({ success: true, id: n.id, isRead: n.isRead });
  } catch (err) {
    console.error('[notifications.readOne]', err);
    res.status(500).json({ error: 'Failed to update notification', details: err.message });
  }
});

// POST /api/notifications/read-all  (bulk mark read)
router.post('/read-all', verifyToken, async (req, res) => {
  try {
    const [count] = await Notification.update(
      { isRead: true },
      { where: { recipientId: req.user.id, isRead: false } }
    );
    res.json({ success: true, updated: count });
  } catch (err) {
    console.error('[notifications.readAll]', err);
    res.status(500).json({ error: 'Failed to mark all as read', details: err.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Notification.count({
      where: { recipientId: req.user.id, isRead: false }
    });
    res.json({ unread: count });
  } catch (err) {
    console.error('[notifications.unreadCount]', err);
    res.status(500).json({ error: 'Failed to get unread count', details: err.message });
  }
});

module.exports = router;
