// server/models/feedback.js
module.exports = (sequelize, DataTypes) => {
  const Feedback = sequelize.define('Feedback', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    // FK to Recommendation
    recommendationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'recommendationId',
      references: { model: 'Recommendations', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    // FK to Student (the student who left the feedback)
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'studentId',
      references: { model: 'Students', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    rating: { type: DataTypes.INTEGER, allowNull: true },     // 1..5
    helpful: { type: DataTypes.BOOLEAN, allowNull: true },     // true/false
    difficulty: {                                              // 'too_easy' | 'just_right' | 'too_hard'
      type: DataTypes.ENUM('too_easy', 'just_right', 'too_hard'),
      allowNull: true,
    },
    comment: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'Feedback',
    timestamps: true,
  });

  Feedback.associate = (models) => {
    Feedback.belongsTo(models.Recommendation, {
      foreignKey: 'recommendationId',
      as: 'recommendation',
    });
    Feedback.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student',
    });
  };

  return Feedback;
};
