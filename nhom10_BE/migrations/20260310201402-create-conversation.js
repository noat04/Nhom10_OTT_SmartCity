'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Conversations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true // Cho phép rỗng (nếu là chat riêng tư 1-1 thì không cần tên nhóm)
      },
      type: {
        type: Sequelize.ENUM('PRIVATE', 'GROUP'), // Bắt buộc phải là 1 trong 2 loại này
        allowNull: false
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Có thể rỗng (Ví dụ: Nhóm cư dân phường thì không thuộc phòng ban nào)
        references: {
          model: 'Departments', // Trỏ tới bảng Departments
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Nếu phòng ban bị xóa, xóa luôn các nhóm chat hỗ trợ của phòng ban đó
      },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Có thể rỗng (Ví dụ: Phòng chat hỗ trợ 1-1 thì không nhất thiết phải gắn cứng vào 1 Phường)
        references: {
          model: 'Locations', // Trỏ tới bảng Locations
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Nếu khu vực bị xóa, xóa luôn các nhóm chat cư dân của khu vực đó
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Conversations');
  }
};