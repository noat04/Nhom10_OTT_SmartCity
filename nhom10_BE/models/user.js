'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // =========================================
      // 1. MỐI QUAN HỆ VỚI BẢNG CHA (Danh mục)
      // =========================================

      // Cán bộ thì thuộc về 1 Phòng ban
      User.belongsTo(models.Department, {
        foreignKey: 'department_id',
        as: 'department' // Khi query, ta gọi .Department để lấy thông tin phòng ban
      });

      // Người dân thì thuộc về 1 Khu vực (Phường/Xã)
      User.belongsTo(models.Location, {
        foreignKey: 'location_id',
        as: 'location'
      });

      // =========================================
      // 2. MỐI QUAN HỆ VỚI BẢNG CON (Nghiệp vụ)
      // =========================================

      // Một người dân có thể gửi nhiều Phiếu phản ánh
      User.hasMany(models.Report, {
        foreignKey: 'citizen_id',
        as: 'sentReports' // Bí danh: Các phản ánh đã gửi
      });

      // Một cán bộ có thể được phân công xử lý nhiều Phiếu phản ánh
      User.hasMany(models.Report, {
        foreignKey: 'official_id',
        as: 'assignedReports' // Bí danh: Các phản ánh được giao xử lý
      });

      User.belongsToMany(models.Conversation, {
        through: models.ConversationUser,
        foreignKey: 'user_id',
        as: 'conversations'
      });
    }

  }

  User.init({
    phone_number: DataTypes.STRING,
    password: DataTypes.STRING,
    full_name: DataTypes.STRING,
    role: DataTypes.STRING,
    department_id: DataTypes.INTEGER,
    location_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'User',
  });

  return User;
};