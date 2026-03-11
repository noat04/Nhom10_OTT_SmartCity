'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      // 1. Nhóm chat này có thể thuộc về quản lý của một Phòng ban (Dành cho chat sự vụ)
      Conversation.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department'
      });

      // 2. Nhóm chat này có thể thuộc về một Khu vực (Dành cho chat cộng đồng dân cư)
      Conversation.belongsTo(models.Location, {
        foreignKey: 'location_id',
        as: 'location'
      });

      // 3. Một phòng chat thường gắn liền với một Hồ sơ phản ánh (Report)
      Conversation.hasOne(models.Report, {
        foreignKey: 'conversation_id',
        as: 'report'
      });

      // 4. (Mở rộng sau này) Một phòng chat có nhiều thành viên tham gia
      // Conversation.belongsToMany(models.User, { through: 'Conversation_Members', foreignKey: 'conversation_id' });
      Conversation.belongsToMany(models.User, {
        through: models.ConversationUser,
        foreignKey: 'conversation_id',
        as: 'members'
      });
    }
  }

  Conversation.init({
    title: {
      type: DataTypes.STRING,
      allowNull: true // Chat 1-1 không cần title, chat GROUP thì cần
    },
    type: {
      type: DataTypes.ENUM('PRIVATE', 'GROUP'), // Phân loại rõ ràng mục đích chat
      allowNull: false
    },
    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    location_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Conversation',
  });

  return Conversation;
};