// services/matchingEngine.js
const Activity = require('../models/activity');

function norm(x) {
  return (x || '').toString().trim().toLowerCase();
}

function toTagSet(tags) {
  if (!tags) return new Set();
  if (Array.isArray(tags)) return new Set(tags.map(norm));
  // support comma-separated string, JSON string, etc.
  try {
    const maybe = JSON.parse(tags);
    if (Array.isArray(maybe)) return new Set(maybe.map(norm));
  } catch (_) { /* not JSON */ }
  return new Set(norm(tags).split(',').map(s => s.trim()).filter(Boolean));
}

exports.getRecommendedActivities = async (student) => {
  const all = await Activity.findAll({
    attributes: ['id', 'title', 'tags', 'difficulty', 'modality']
  });

  const ls = norm(student.learningStyle);
  const dis = norm(student.disability);

  const recs = [];
  for (const a of all) {
    const tagSet = toTagSet(a.tags);
    let score = 0;

    if (ls && tagSet.has(ls)) score += 0.5;
    if (dis && tagSet.has(dis)) score += 0.5;

    // small tie-breakers (optional)
    if (!ls && a.modality && norm(a.modality) === 'visual') score += 0.1;
    if (typeof a.difficulty === 'number') score += 0.01 * (5 - Math.min(Math.max(a.difficulty, 1), 5)); // prefer easier

    if (score > 0) recs.push({ activityId: a.id, score });
  }

  recs.sort((a, b) => b.score - a.score);
  return recs;
};