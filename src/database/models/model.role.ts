import { DataTypes, Model, Sequelize } from 'sequelize';

export default class RoleModel extends Model {
  /* fields */

  declare roleName: string;

  declare login: string;

  /* auto-generated fields */

  declare id: number;

  declare createdAt: Date;

  declare updatedAt: Date;

  public static definition(sequelize: Sequelize) {
    RoleModel.init(
      {
        login: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        roleName: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        tableName: 'role',
        sequelize,
      },
    );
  }

  public static associate() {}
}
