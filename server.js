// server.js
const app = require('./app');
const { sequelize } = require('./config/sequelize');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ DB connected: ${sequelize.config.database}`);

    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ DB synced (dev mode).');
    }

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Shutting down...');
      await sequelize.close();
      server.close(() => process.exit(0));
    });

  } catch (err) {
    console.error('❌ DB connection failed:', err);
    process.exit(1);
  }
})();
