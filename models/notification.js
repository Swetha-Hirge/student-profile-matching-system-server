const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const User = require('./user');

const Notification = sequelize.define('Notification', {
  message: { type: DataTypes.STRING, allowNull: false },
  isRead:  { type: DataTypes.BOOLEAN, defaultValue: false },
  recipientId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  indexes: [
    { fields: ['recipientId', 'isRead'] },
    { fields: ['createdAt'] }
  ]
});

Notification.belongsTo(User, { as: 'recipient', foreignKey: 'recipientId' });

module.exports = Notification;
