'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up (queryInterface, Sequelize) {
    // Mã hóa mật khẩu chuẩn
    const hashedPassword = await bcrypt.hash('123456', 10);

    await queryInterface.bulkInsert('Users', [
      {
        id:1,
        phone_number: '0999999999',
        password: hashedPassword, // Dùng biến đã mã hóa ở trên
        full_name: 'Nguyễn Danh Minh Toàn',
        role: 'ADMIN',
        department_id: null,
        location_id: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id:2,
        phone_number: '0888888888',
        password: hashedPassword, // Dùng biến đã mã hóa ở trên
        full_name: 'Nguyễn Văn B', // Nhớ viết đúng Tiếng Việt có dấu
        role: 'OFFICIAL',
        department_id: 1,
        location_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id:3,
        phone_number: '0888888887',
        password: hashedPassword, // Dùng biến đã mã hóa ở trên
        full_name: 'Nguyễn Văn C', // Nhớ viết đúng Tiếng Việt có dấu
        role: 'CITIZEN',
        department_id: 2,
        location_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};