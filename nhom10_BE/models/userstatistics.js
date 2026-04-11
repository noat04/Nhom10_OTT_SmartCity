'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserStatistics extends Model {
    static associate(models) {
      UserStatistics.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  UserStatistics.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    totalMessages: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalCalls: { type: DataTypes.INTEGER, defaultValue: 0 },
    activeTime: { type: DataTypes.FLOAT, defaultValue: 0.0 }
  }, {
    sequelize,
    modelName: 'UserStatistics',
    tableName: 'UserStatistics',
    timestamps: true,
    updatedAt: false
  });
  return UserStatistics;
};