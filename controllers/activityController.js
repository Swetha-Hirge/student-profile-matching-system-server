const Activity = require('../models/activity');

function normStr(x) {
  return (x ?? '').toString().trim();
}
function parseTags(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(normStr).filter(Boolean);
  // support JSON string:
  try {
    const asJson = JSON.parse(input);
    if (Array.isArray(asJson)) return asJson.map(normStr).filter(Boolean);
  } catch (_) {}
  // comma separated
  return normStr(input).split(',').map(s => s.trim()).filter(Boolean);
}
function tagsToStore(tagsArr) {
  // store as comma-separated
  return (tagsArr || []).map(normStr).filter(Boolean).join(',');
}
function has(list, val) {
  const set = new Set(list.map(v => v.toLowerCase()));
  return set.has((val || '').toLowerCase());
}

/**
 * GET /api/activities
 * Optional query: q=, modality=, minDifficulty=, maxDifficulty=, tag= (repeatable), limit, offset, order=id|createdAt, dir=ASC|DESC
 */
exports.getAllActivities = async (req, res) => {
  try {
    const q = normStr(req.query.q);
    const modality = normStr(req.query.modality);
    const minDifficulty = Math.max(parseInt(req.query.minDifficulty ?? '1', 10) || 1, 1);
    const maxDifficulty = Math.min(parseInt(req.query.maxDifficulty ?? '5', 10) || 5, 5);

    const limit = Math.min(Math.max(parseInt(req.query.limit ?? '25', 10), 1), 100);
    const offset = Math.max(parseInt(req.query.offset ?? '0', 10), 0);
    const order = ['id', 'createdAt', 'difficulty', 'title'].includes(normStr(req.query.order)) ? normStr(req.query.order) : 'id';
    const dir = (normStr(req.query.dir).toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

    const rows = await Activity.findAll({ order: [[order, dir]] }); // filter in memory due to tags as TEXT

    // in-memory filtering to handle tags TEXT and case-insensitive fields
    const tagFilters = ([]).concat(req.query.tag || []); // support ?tag=a&tag=b
    const tagFiltersNorm = tagFilters.map(normStr).filter(Boolean);

    const filtered = rows.filter(a => {
      const titleOk = q ? a.title.toLowerCase().includes(q.toLowerCase()) : true;
      const modalityOk = modality ? (a.modality || '').toLowerCase() === modality.toLowerCase() : true;
      const diffOk = typeof a.difficulty === 'number' && a.difficulty >= minDifficulty && a.difficulty <= maxDifficulty;

      // tags
      const aTags = parseTags(a.tags);
      const allTagsOk = tagFiltersNorm.length
        ? tagFiltersNorm.every(t => has(aTags, t))
        : true;

      return titleOk && modalityOk && diffOk && allTagsOk;
    });

    const paged = filtered.slice(offset, offset + limit);

    res.json({
      data: paged,
      meta: {
        total: filtered.length,
        limit,
        offset,
        order,
        dir,
        hasMore: offset + paged.length < filtered.length
      }
    });
  } catch (err) {
    console.error('[activities.getAll]', err);
    res.status(500).json({ error: 'Failed to fetch activities', details: err.message });
  }
};

exports.getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity', details: err.message });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const title = normStr(req.body.title);
    const description = normStr(req.body.description);
    const modality = normStr(req.body.modality);
    const difficulty = Number(req.body.difficulty);
    const tagsArr = parseTags(req.body.tags);

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!Number.isFinite(difficulty) || difficulty < 1 || difficulty > 5) {
      return res.status(400).json({ error: 'difficulty must be an integer 1..5' });
    }

    const activity = await Activity.create({
      title,
      description,
      modality,
      difficulty,
      tags: tagsToStore(tagsArr)
    });

    res.status(201).json(activity);
  } catch (err) {
    console.error('[activities.create]', err);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Activity title already exists' });
    }
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

    const activity = await Activity.findByPk(id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    try {
      await activity.destroy(); // will throw if FK constraint blocks it
      return res.json({ message: 'Activity deleted', id });
    } catch (err) {
      // Most dialects surface a FK issue as this:
      const isFK =
        err?.name === 'SequelizeForeignKeyConstraintError' ||
        err?.parent?.code === '23503' ||                    // Postgres
        err?.original?.code === 'ER_ROW_IS_REFERENCED_2';   // MySQL

      if (isFK) {
        return res.status(409).json({
          error: 'Cannot delete: activity is referenced by recommendations',
          hint: 'Delete or detach related recommendations first.'
        });
      }
      console.error('[activities.delete destroy]', err);
      return res.status(500).json({ error: 'Failed to delete activity', details: err.message });
    }
  } catch (err) {
    console.error('[activities.delete]', err);
    res.status(500).json({ error: 'Failed to delete activity', details: err.message });
  }
};