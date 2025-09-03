const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const Recommendation = require('./recommendation');

const Feedback = sequelize.define('Feedback', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  comment: { type: DataTypes.TEXT },
  score: { type: DataTypes.FLOAT },
});

Recommendation.hasMany(Feedback);
Feedback.belongsTo(Recommendation);

module.exports = Feedback;
