'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Friend, { foreignKey: 'userId', as: 'friends' });
      User.hasMany(models.Friend, { foreignKey: 'friendId', as: 'friendRequests' });
      User.belongsToMany(models.Conversation, { through: models.ConversationMember, foreignKey: 'userId', as: 'conversations' });
      User.hasMany(models.Call, { foreignKey: 'callerId', as: 'madeCalls' });
      User.hasMany(models.Call, { foreignKey: 'receiverId', as: 'receivedCalls' });
      User.hasMany(models.Notification, { foreignKey: 'userId', as: 'notifications' });
      User.hasOne(models.UserStatistics, { foreignKey: 'userId', as: 'statistics' });
      User.hasMany(models.FileUpload, { foreignKey: 'uploaderId', as: 'uploads' });
    }
  }
  User.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: DataTypes.STRING,
    fullName: DataTypes.STRING,
    avatar: DataTypes.STRING,
    coverImage: DataTypes.STRING,
    bio: DataTypes.TEXT,
    status: { type: DataTypes.STRING, defaultValue: 'offline' },
    lastSeen: DataTypes.DATE,

    // 🔥 THÊM OTP
    otp: DataTypes.STRING,
    otpExpires: DataTypes.DATE,
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true
  });
  return User;
};