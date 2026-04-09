'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Friends', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      userId: { 
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE'
      },
      friendId: { 
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE'
      },
      status: { type: Sequelize.ENUM('pending', 'accepted', 'blocked'), defaultValue: 'pending' },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Friends');
  }
};