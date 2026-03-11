'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Conversations', [
      {
        id:1,
        title: 'Hỗ trợ sự cố: Hố ga mất nắp tại Phường 1',
        type: 'PRIVATE',
        department_id: 1, // Giả định 1 là Phòng Công an hoặc Giao thông
        location_id: 1,   // Giả định 1 là Phường 1
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id:2,
        title: 'Tư vấn tiêm chủng tại Phường 2',
        type: 'PRIVATE',
        department_id: 2, // Giả định 2 là Phòng Y tế
        location_id: 2,   // Giả định 2 là Phường 2
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        title: 'Nhóm thảo luận cộng đồng Quận 1',
        type: 'GROUP', // Loại phòng chat nhóm
        department_id: null, // Nhóm cộng đồng có thể không thuộc phòng ban nào cụ thể
        location_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    // Xóa dữ liệu khi undo
    await queryInterface.bulkDelete('Conversations', null, {});
  }
};