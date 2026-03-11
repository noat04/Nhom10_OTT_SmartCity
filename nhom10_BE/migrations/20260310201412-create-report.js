'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false // Bắt buộc phải có tiêu đề sự cố
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false // Bắt buộc phải có mô tả chi tiết
      },
      status: {
        // 4 trạng thái theo luồng: Chờ tiếp nhận -> Đang xử lý -> Đã giải quyết -> Hoàn thành
        type: Sequelize.ENUM('PENDING', 'PROCESSING', 'RESOLVED', 'COMPLETED'),
        defaultValue: 'PENDING',
        allowNull: false
      },
      citizen_id: {
        type: Sequelize.INTEGER,
        allowNull: false, // Bắt buộc phải biết ai là người gửi
        references: {
          model: 'Users', // Tên bảng tham chiếu
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Xóa user dân thì xóa luôn các phản ánh của họ
      },
      official_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Lúc mới gửi (PENDING) thì chưa có cán bộ nào nhận nên được phép NULL
        references: {
          model: 'Users', // Cán bộ cũng nằm trong bảng Users
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL' // Nếu tài khoản cán bộ bị xóa, phản ánh sẽ không bị mất mà trở về trạng thái chưa có người nhận (NULL)
      },
      department_id: {
        type: Sequelize.INTEGER,
        allowNull: false, // Bắt buộc phải thuộc về 1 phòng ban (VD: Môi trường, Giao thông)
        references: {
          model: 'Departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: false, // Mỗi phản ánh phải gắn với 1 phòng chat sự vụ [cite: 165]
        references: {
          model: 'Conversations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Thêm vào trong queryInterface.createTable:
      images: {
        type: Sequelize.TEXT, // Lưu mảng các URL ảnh cách nhau bởi dấu phẩy hoặc JSON string
        allowNull: true
      },
      lat: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      lng: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true
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
    await queryInterface.dropTable('Reports');
  }
};