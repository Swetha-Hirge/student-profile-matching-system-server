// server/models/index.js
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const basename = path.basename(__filename);

const config = require('../config/sequelize'); // your existing sequelize config
const sequelize = config.sequelize || new Sequelize(config.database, config.username, config.password, config);

const db = {};

// auto-load all model files (including feedback.js)
fs.readdirSync(__dirname)
  .filter(file =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js'
  )
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// run associate() for models that define it
Object.keys(db).forEach(name => {
  if (db[name].associate) {
    db[name].associate(db);
  }
});
// module.exports = (sequelize, DataTypes) => {
//   const Feedback = sequelize.define('Feedback', { … });
//   return Feedback;
// };
// models/index.js (snippet)
Teacher.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Teacher, { foreignKey: 'userId', as: 'teacherProfile' });

Teacher.hasMany(Student, { foreignKey: 'teacherId', as: 'students' });
Student.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
