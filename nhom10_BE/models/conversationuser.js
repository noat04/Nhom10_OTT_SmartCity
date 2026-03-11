'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Giả định:
     * - User ID 1: Admin
     * - User ID 2: Cán bộ (Official)
     * - User ID 3: Người dân (Citizen)
     * - Conversation ID 1: Phòng chat về sự cố hố ga
     * - Conversation ID 2: Phòng chat về y tế
     */
    await queryInterface.bulkInsert('Conversation_Users', [
      // Cuộc hội thoại 1: Có sự tham gia của Dân (Member) và Cán bộ (Admin của phòng chat)
      {
        conversation_id: 1,
        user_id: 3,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        conversation_id: 1,
        user_id: 2,
        role: 'ADMIN', // Cán bộ có quyền quản lý phòng chat này
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ], {});
  },

  async down(queryInterface, Sequelize) {
    // Xóa sạch dữ liệu trong bảng trung gian khi undo
    await queryInterface.bulkDelete('Conversation_Users', null, {});
  }
};