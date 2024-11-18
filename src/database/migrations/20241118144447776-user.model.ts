import { QueryInterface, Sequelize, DataTypes } from 'sequelize';

export default {
    up: async (queryInterface: QueryInterface, _sequelize: Sequelize) => {
        await queryInterface.createTable('user', {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            discordId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        });
    },
    down: async (queryInterface: QueryInterface, _sequelize: Sequelize) => {
        await queryInterface.dropTable('user');
    },
};
