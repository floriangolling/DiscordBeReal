import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface UserAttributes {
    id: number;
    discordId: string;
    createdAt: Date;
    updatedAt: Date;
}

interface UserCreationAttributes
    extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export default class User extends Model<UserAttributes, UserCreationAttributes> {
    public static definition(sequelize: Sequelize) {
        User.init(
            {
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
            },
            {
                tableName: 'user',
                sequelize,
            },
        );
    }

    public static associate() {}

    /* fields */

    public discordId!: string;

    /* auto-generated fields */

    public id!: number;

    public createdAt!: Date;

    public updatedAt!: Date;
}
