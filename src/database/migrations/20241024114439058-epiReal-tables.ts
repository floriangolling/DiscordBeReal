import { QueryInterface, Sequelize, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    queryInterface.createTable('epireal', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nextProc: {
        type: DataTypes.DATE,
        allowNull: false,
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
  down: async (queryInterface: QueryInterface, _sequelize: Sequelize) => {
    queryInterface.dropTable('epireal');
  },
};
