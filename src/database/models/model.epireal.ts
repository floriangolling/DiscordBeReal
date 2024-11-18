import { DataTypes, Model, Sequelize } from 'sequelize';

export default class EpirealModel extends Model {
  /* fields */

  declare nextProc: Date;

  /* auto-generated fields */

  declare id: number;

  declare createdAt: Date;

  declare updatedAt: Date;

  public static definition(sequelize: Sequelize) {
    EpirealModel.init(
      {
        nextProc: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        tableName: 'epireal',
        sequelize,
      },
    );
  }

  public static associate() {}
}
