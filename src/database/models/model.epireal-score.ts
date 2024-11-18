import { DataTypes, Model, Sequelize } from 'sequelize';

export default class EpirealScoreModel extends Model {
  /* fields */

  declare discordId: string;

  declare streak: number;

  declare streakSave: number;

  /* auto-generated fields */

  declare id: number;

  declare createdAt: Date;

  declare updatedAt: Date;

  public static definition(sequelize: Sequelize) {
    EpirealScoreModel.init(
      {
        discordId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        streak: {
          type: DataTypes.NUMBER,
          allowNull: false,
          defaultValue: 0,
        },
        streakSave: {
          type: DataTypes.NUMBER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        tableName: 'epirealScore',
        sequelize,
      },
    );
  }

  public static associate() {}
}
