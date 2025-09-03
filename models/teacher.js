// models/teacher.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const User = require('./user');

const Teacher = sequelize.define('Teacher', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  subject: { type: DataTypes.STRING },
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true }
}, {
  // timestamps: true  // default true if not overridden globally
});

Teacher.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Teacher, { foreignKey: 'userId', as: 'teacherProfile' });

module.exports = Teacher;
