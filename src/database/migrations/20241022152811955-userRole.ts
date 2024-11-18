import { DataTypes, QueryInterface, Sequelize } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    queryInterface.createTable('role', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      login: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      roleName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },
  down: async (queryInterface: QueryInterface) => {
    queryInterface.dropTable('role');
  },
};
