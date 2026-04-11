'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      Conversation.belongsToMany(models.User, { through: models.ConversationMember, foreignKey: 'conversationId', as: 'members' });
      Conversation.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    }
  }
  Conversation.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.ENUM('private', 'group'), allowNull: false },
    name: DataTypes.STRING,
    avatar: DataTypes.STRING,
    createdBy: DataTypes.UUID
  }, {
    sequelize,
    modelName: 'Conversation',
    tableName: 'Conversations',
    timestamps: true
  });
  return Conversation;
};