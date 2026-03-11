'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Locations', [
      { id: 1, name: 'Phường 1', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'Phường 2', createdAt: new Date(), updatedAt: new Date() },
      { id: 3, name: 'Phường 3', createdAt: new Date(), updatedAt: new Date() },
      { id: 4, name: 'Phường 4', createdAt: new Date(), updatedAt: new Date() }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Locations', null, {});
  }
};