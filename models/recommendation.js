// models/recommendation.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const Student = require('./student');
const Activity = require('./activity');

const Recommendation = sequelize.define('Recommendation', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  studentId:{ type: DataTypes.INTEGER, allowNull: false },
  activityId:{ type: DataTypes.INTEGER, allowNull: false },
  score:    { type: DataTypes.FLOAT, allowNull: false, validate: { min: 0, max: 1 } }
}, {
  indexes: [
    { unique: true, fields: ['studentId', 'activityId'] } // prevent duplicates
  ]
});

// Associations with explicit aliases so includes work
Student.hasMany(Recommendation, { foreignKey: 'studentId', as: 'recommendations' });
Recommendation.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

Activity.hasMany(Recommendation, { foreignKey: 'activityId', as: 'recommendations' });
Recommendation.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

module.exports = Recommendation;