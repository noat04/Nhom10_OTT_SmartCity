'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Friend extends Model {
    static associate(models) {
      Friend.belongsTo(models.User, { foreignKey: 'userId', as: 'sender' });
      Friend.belongsTo(models.User, { foreignKey: 'friendId', as: 'receiver' });
    }
  }
  Friend.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    friendId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'accepted', 'blocked'), defaultValue: 'pending' }
  }, {
    sequelize,
    modelName: 'Friend',
    tableName: 'Friends',
    timestamps: true
  });
  return Friend;
};