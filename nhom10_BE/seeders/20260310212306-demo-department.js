'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Departments', [
      {
        id:1,
        name: 'Phòng Công an',
        description: 'Tiếp nhận phản ánh về an ninh trật tự, an toàn xã hội.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id:2,
        name: 'Phòng Y tế',
        description: 'Quản lý các vấn đề về an toàn thực phẩm, dịch bệnh và trạm y tế.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Departments', null, {});
  }
};