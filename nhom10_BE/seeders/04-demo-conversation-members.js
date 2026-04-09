'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('ConversationMembers', [
      {
        id: uuidv4(),
        conversationId: '33333333-3333-3333-3333-333333333333',
        userId: '11111111-1111-1111-1111-111111111111', // User A
        role: 'admin',
        joinedAt: new Date()
      },
      {
        id: uuidv4(),
        conversationId: '33333333-3333-3333-3333-333333333333',
        userId: '22222222-2222-2222-2222-222222222222', // User B
        role: 'member',
        joinedAt: new Date()
      }
    ], {});
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('ConversationMembers', null, {});
  }
};