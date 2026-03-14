import {
  Model,
  DataTypes,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize';

export class TranscriptChunkModel extends Model<
  InferAttributes<TranscriptChunkModel>,
  InferCreationAttributes<TranscriptChunkModel>
> {
  declare id: CreationOptional<string>;
  declare video_url: string;
  declare chunk_text: string;
  declare start_time: number;
  declare end_time: number;
  declare embedding: number[];
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  static setup(sequelize: Sequelize) {
    const VectorType = (DataTypes as { VECTOR?: (dims: number) => unknown })
      .VECTOR;
    if (!VectorType) {
      throw new Error(
        'pgvector VECTOR type not registered. Call registerTypes(Sequelize) before model init.',
      );
    }

    TranscriptChunkModel.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        video_url: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        chunk_text: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        start_time: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        end_time: {
          type: DataTypes.FLOAT,
          allowNull: false,
        },
        embedding: {
          type: VectorType(768) as never,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'transcript_chunks',
        modelName: 'TranscriptChunkModel',
        timestamps: true,
      },
    );

    return TranscriptChunkModel;
  }
}
