'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash('123456', salt);

    await queryInterface.bulkInsert('Users', [
      {
        id: '11111111-1111-1111-1111-111111111111',
        username: 'nguyenvana',
        email: 'vana@gmail.com',
        password: hashPassword,
        fullName: 'Nguyễn Văn A',
        status: 'online',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        username: 'tranvanb',
        email: 'vanb@gmail.com',
        password: hashPassword,
        fullName: 'Trần Văn B',
        status: 'offline',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};