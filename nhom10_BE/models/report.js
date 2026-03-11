'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      Report.belongsTo(models.User, { foreignKey: 'citizen_id', as: 'citizen' });
      Report.belongsTo(models.User, { foreignKey: 'official_id', as: 'official' });
      Report.belongsTo(models.Department, { foreignKey: 'department_id', as: 'department' });
      Report.belongsTo(models.Conversation, { foreignKey: 'conversation_id', as: 'conversation' });
    }
  }

  Report.init({
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    // Lưu danh sách link ảnh dưới dạng chuỗi JSON hoặc Text
    images: { type: DataTypes.TEXT, allowNull: true },
    // Tọa độ GPS để cán bộ tìm đến đúng hiện trường
    lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
    lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },

    status: {
      type: DataTypes.ENUM('PENDING', 'PROCESSING', 'RESOLVED', 'COMPLETED'),
      defaultValue: 'PENDING'
    },
    citizen_id: DataTypes.INTEGER,
    official_id: DataTypes.INTEGER,
    department_id: DataTypes.INTEGER,
    conversation_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Report',
  });

  return Report;
};