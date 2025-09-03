// models/student.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const User = require('./user');
const Teacher = require('./teacher');

const Student = sequelize.define('Student', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  teacherId: { type: DataTypes.INTEGER, allowNull: false },
  disability: { type: DataTypes.STRING },
  learningStyle: { type: DataTypes.STRING }
});

Student.belongsTo(User,   { foreignKey: 'userId',   as: 'user' });
User.hasOne(Student,      { foreignKey: 'userId',   as: 'studentProfile' });
Student.belongsTo(Teacher,{ foreignKey: 'teacherId',as: 'teacher' });
Teacher.hasMany(Student,  { foreignKey: 'teacherId',as: 'students' });

module.exports = Student;
