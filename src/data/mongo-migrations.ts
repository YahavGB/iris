import 'module-alias/register';
import {loadEnvironmentVariables, isDevelopment} from '@util/env';
import {createMongoDbDataSource} from '@/data/mongo';
import path from 'path';

loadEnvironmentVariables();

export const MongoDataSource = createMongoDbDataSource({
  type: 'mongodb',
  database: '',
  migrations: [
    // __dirname + '/../core/migrations/**/*{.ts,.js}',
    __dirname + '/../core/migrations/*{.ts,.js}',
  ],
  // namingStrategy: new SnakeNamingStrategy(),
});
