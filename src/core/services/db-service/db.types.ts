// import { Model } from 'mongoose';
import { SQL_MODELS } from './models';
// import { MONGOOSE_MODELS } from './models';

export type SqlModelsType = {
  [K in keyof typeof SQL_MODELS]: ReturnType<(typeof SQL_MODELS)[K]>;
};

// export type MongoModelsType = {
//   [K in keyof typeof MONGOOSE_MODELS]: Model<any>;
// };
