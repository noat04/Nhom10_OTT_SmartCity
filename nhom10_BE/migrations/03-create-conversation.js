'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Conversations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      type: { type: Sequelize.ENUM('private', 'group'), allowNull: false },
      name: { type: Sequelize.STRING },
      avatar: { type: Sequelize.STRING },
      createdBy: { 
        type: Sequelize.UUID,
        references: { model: 'Users', key: 'id' }, onDelete: 'SET NULL'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Conversations');
  }
};