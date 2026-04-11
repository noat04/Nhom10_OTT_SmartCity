'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Call extends Model {
    static associate(models) {
      Call.belongsTo(models.User, { foreignKey: 'callerId', as: 'caller' });
      Call.belongsTo(models.User, { foreignKey: 'receiverId', as: 'receiver' });
    }
  }
  Call.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    callerId: { type: DataTypes.UUID, allowNull: false },
    receiverId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM('video', 'audio'), allowNull: false },
    status: { type: DataTypes.ENUM('calling', 'accepted', 'rejected', 'ended'), defaultValue: 'calling' },
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'Call',
    tableName: 'Calls',
    timestamps: false
  });
  return Call;
};