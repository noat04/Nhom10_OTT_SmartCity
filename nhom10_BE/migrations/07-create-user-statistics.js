'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserStatistics', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { 
        type: Sequelize.UUID, allowNull: false, unique: true,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE'
      },
      totalMessages: { type: Sequelize.INTEGER, defaultValue: 0 },
      totalCalls: { type: Sequelize.INTEGER, defaultValue: 0 },
      activeTime: { type: Sequelize.FLOAT, defaultValue: 0.0 },
      createdAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserStatistics');
  }
};