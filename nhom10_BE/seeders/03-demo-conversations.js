'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Conversations', [
      {
        id: '33333333-3333-3333-3333-333333333333',
        type: 'private',
        name: null, // Chat 1-1 thường không cần tên
        createdBy: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Conversations', null, {});
  }
};