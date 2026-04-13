'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'otp', {
      type: Sequelize.STRING
    });

    await queryInterface.addColumn('Users', 'otpExpires', {
      type: Sequelize.DATE
    });

    await queryInterface.addColumn('Users', 'isVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'otp');
    await queryInterface.removeColumn('Users', 'otpExpires');
    await queryInterface.removeColumn('Users', 'isVerified');
  }
};