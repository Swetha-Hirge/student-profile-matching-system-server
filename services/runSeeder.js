const { sequelize } = require('../config/sequelize');
const seedActivities = require('../seeders/initialData');

(async () => {
  try {
    await sequelize.sync(); // ensure DB is connected
    await seedActivities();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
})();
