'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Conversation_Users', {
      id: {
        allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER
      },
      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Conversations', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      role: {
        type: Sequelize.ENUM('MEMBER', 'ADMIN'),
        defaultValue: 'MEMBER'
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Conversation_Users');
  }
};