import { QueryInterface, Sequelize, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface, sequelize: Sequelize) => {
    queryInterface.createTable('epirealScore', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      discordId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      streakSave: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    queryInterface.dropTable('epirealScore');
  },
};
