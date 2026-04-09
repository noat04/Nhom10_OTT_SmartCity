'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FileUploads', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      uploaderId: { 
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE'
      },
      fileName: { type: Sequelize.STRING, allowNull: false },
      fileUrl: { type: Sequelize.STRING, allowNull: false },
      fileType: { type: Sequelize.ENUM('image', 'video', 'doc', 'file'), allowNull: false },
      size: { type: Sequelize.FLOAT, allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('FileUploads');
  }
};