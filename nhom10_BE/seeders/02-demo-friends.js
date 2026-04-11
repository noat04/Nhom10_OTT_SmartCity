'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Friends', [
      {
        id: uuidv4(),
        userId: '11111111-1111-1111-1111-111111111111', // User A
        friendId: '22222222-2222-2222-2222-222222222222', // User B
        status: 'accepted',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Friends', null, {});
  }
};