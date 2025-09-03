const { sequelize } = require('../config/sequelize');

module.exports = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('All tables created.');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};
