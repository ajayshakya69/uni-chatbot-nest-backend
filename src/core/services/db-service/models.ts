import { UserModel } from 'src/modules/users/users.schema';
// import { ClassSchema } from 'src/modules/users/users.schema';
import { TranscriptChunkModel } from 'src/modules/transcript/transcript-chunk.schema';

// export const MONGOOSE_MODELS = {
//   Class: ClassSchema,
// };

export const SQL_MODELS = {
  UserModel: UserModel.setup,
  TranscriptChunkModel: TranscriptChunkModel.setup,
};




