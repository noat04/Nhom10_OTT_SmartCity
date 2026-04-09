'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Calls', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      callerId: { 
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE'
      },
      receiverId: { 
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE'
      },
      type: { type: Sequelize.ENUM('video', 'audio'), allowNull: false },
      status: { type: Sequelize.ENUM('calling', 'accepted', 'rejected', 'ended'), defaultValue: 'calling' },
      startTime: { type: Sequelize.DATE },
      endTime: { type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Calls');
  }
};