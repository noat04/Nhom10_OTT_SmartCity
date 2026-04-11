'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ConversationMembers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      conversationId: { 
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'Conversations', key: 'id' }, onDelete: 'CASCADE'
      },
      userId: { 
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE'
      },
      role: { type: Sequelize.ENUM('admin', 'member'), defaultValue: 'member' },
      joinedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ConversationMembers');
  }
};