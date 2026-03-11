'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    /**
     * Helper method for defining associations.
     */
    static associate(models) {
      // 1. Một Khu vực có nhiều Người dùng (Dân cư sinh sống tại đó)
      Location.hasMany(models.User, {
        foreignKey: 'location_id',
        as: 'users'
      });

      // 2. Một Khu vực có thể có nhiều Nhóm chat cộng đồng (Ví dụ: Nhóm cư dân Phường 1)
      Location.hasMany(models.Conversation, {
        foreignKey: 'location_id',
        as: 'conversations'
      });
    }
  }

  Location.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true // Đảm bảo tên khu vực không bị trùng lặp trong hệ thống
    }
  }, {
    sequelize,
    modelName: 'Location',
  });

  return Location;
};