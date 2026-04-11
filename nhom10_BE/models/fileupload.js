'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FileUpload extends Model {
    static associate(models) {
      FileUpload.belongsTo(models.User, { foreignKey: 'uploaderId', as: 'uploader' });
    }
  }
  FileUpload.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    uploaderId: { type: DataTypes.UUID, allowNull: false },
    fileName: { type: DataTypes.STRING, allowNull: false },
    fileUrl: { type: DataTypes.STRING, allowNull: false },
    fileType: { type: DataTypes.ENUM('image', 'video', 'doc', 'file'), allowNull: false },
    size: { type: DataTypes.FLOAT, allowNull: false }
  }, {
    sequelize,
    modelName: 'FileUpload',
    tableName: 'FileUploads',
    timestamps: true,
    updatedAt: false
  });
  return FileUpload;
};