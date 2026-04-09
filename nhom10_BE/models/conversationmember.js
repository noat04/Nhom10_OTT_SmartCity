'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConversationMember extends Model {
    static associate(models) {
      ConversationMember.belongsTo(models.User, { foreignKey: 'userId' });
      ConversationMember.belongsTo(models.Conversation, { foreignKey: 'conversationId' });
    }
  }
  ConversationMember.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    conversationId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' },
    joinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    sequelize,
    modelName: 'ConversationMember',
    tableName: 'ConversationMembers',
    timestamps: false // Tài liệu chỉ yêu cầu joinedAt
  });
  return ConversationMember;
};