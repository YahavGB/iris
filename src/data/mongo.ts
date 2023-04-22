import {DataSource} from 'typeorm';
import {MongoConnectionOptions} from 'typeorm/driver/mongodb/MongoConnectionOptions';

export const createMongoDbDataSource = (options?: MongoConnectionOptions) => {
  return new DataSource(
    Object.assign(
      {
        type: 'mongodb',
        authSource: 'admin',
        host: process.env.MONGO_HOST,
        port: process.env.MONGO_PORT
          ? parseInt(process.env.MONGO_PORT, 10)
          : 27017,
        database: process.env.MONGO_DATABASE,
        username: process.env.MONGO_USERNAME,
        password: process.env.MONGO_PASSWORD,
        timeout: process.env.MONGO_TIMEOUT
          ? parseInt(process.env.MONGO_TIMEOUT, 10)
          : 10000,
        sslValidate: false,
        synchronize: true,
        entities: [
          __dirname + '/../core/models/**/*{.ts,.js}',
          __dirname + '/../core/models/*{.ts,.js}',
        ],
      },
      options
    )
  );
};
