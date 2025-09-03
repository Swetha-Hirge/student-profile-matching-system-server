const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Activity = sequelize.define('Activity', {
  id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:       { type: DataTypes.STRING,  allowNull: false, unique: true },
  description: { type: DataTypes.TEXT },
  difficulty:  { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } }, // 1..5
  modality:    { type: DataTypes.STRING },    // e.g. 'visual','auditory','kinesthetic','reading/writing'
  // store as TEXT (comma-separated) or JSON (dialect-dependent). If Postgres, JSONB is nice:
  // tags:     { type: DataTypes.JSONB, defaultValue: [] }
  tags:        { type: DataTypes.TEXT, defaultValue: '' } // we'll parse "a,b,c"
}, {
  indexes: [{ fields: ['difficulty'] }, { fields: ['modality'] }, { fields: ['title'] }]
});

module.exports = Activity;