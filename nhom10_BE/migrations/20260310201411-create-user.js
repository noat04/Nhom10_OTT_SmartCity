'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true // Số điện thoại không được trùng

      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: false

      },
      role: {
        type: Sequelize.ENUM('CITIZEN', 'OFFICIAL', 'ADMIN'), // Phân quyền 3 cấp độ
        defaultValue: 'CITIZEN'

      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Departments', key: 'id' } // Khóa ngoại trỏ tới bảng Departments

      },
      location_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Locations', key: 'id' } // Khóa ngoại trỏ tới bảng Locations

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
    await queryInterface.dropTable('Users');
  }
};