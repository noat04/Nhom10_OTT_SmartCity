'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConversationUser extends Model {
    static associate(models) {
      // Các mối quan hệ
      ConversationUser.belongsTo(models.User, { foreignKey: 'user_id' });
      ConversationUser.belongsTo(models.Conversation, { foreignKey: 'conversation_id' });
    }
  }

  ConversationUser.init({
    conversation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'Conversations', // Tên bảng trong DB
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('ADMIN', 'MEMBER'),
      defaultValue: 'MEMBER'
    }
  }, {
    sequelize,
    modelName: 'ConversationUser',
    tableName: 'Conversation_Users', // Tên bảng thực tế trong MySQL
    timestamps: true
  });

  return ConversationUser;
};