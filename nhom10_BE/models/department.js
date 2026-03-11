'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      // 1 Phòng ban có nhiều Cán bộ (Users)
      Department.hasMany(models.User, {
        foreignKey: 'department_id',
        as: 'officials'
      });

      // 1 Phòng ban có thể quản lý nhiều Nhóm chat sự vụ (Conversations)
      Department.hasMany(models.Conversation, {
        foreignKey: 'department_id',
        as: 'conversations'
      });

      // 1 Phòng ban tiếp nhận nhiều Phiếu phản ánh (Reports)
      Department.hasMany(models.Report, {
        foreignKey: 'department_id',
        as: 'reports'
      });
    }
  }

  Department.init({
    name: DataTypes.STRING,
    description: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'Department',
  });

  return Department;
};