// Create a main program that shows a CLI options:
// --source: The source file to read from
// --help: Show the help message

import 'module-alias/register';
import {Command, OptionValues} from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import {promisify} from 'util';
import {HouseBlueprint} from '@core/blueprints';
import util from 'util';
import {createMongoDbDataSource} from '../data/mongo';
import {getEnvironment, loadEnvironmentVariables} from '@util/env';

const createProgramCommands = (): Command => {
  const program = new Command();

  program
    .name('iris-home-seed')
    .description('Iris CLI tool used to seed the database')
    .version('0.0.1');

  program
    .option('--verbose', 'Show verbose output', false)
    .option('-p, --purge', 'Purge the database')
    .option('-s, --seed <string>', 'The seed file to use');

  return program;
};

const seedDatabase = async (options: OptionValues, seedFile: string) => {
  const {verbose} = options;

  // Resolve the seed file into an absolute path
  seedFile = path.resolve(seedFile);

  // Does the file exist?
  if (!fs.existsSync(seedFile)) {
    console.error('The seed file does not exist: ' + seedFile);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  console.log('Attempting to seed the database with file: ' + seedFile);

  // Read the seed file
  const readFileAsync = promisify(fs.readFile);
  const seedFileContents = (await readFileAsync(seedFile)).toString('utf-8');
  const seedData = JSON.parse(seedFileContents);

  // Use the HouseBlueprint to build the House object
  const houseBlueprint = new HouseBlueprint();
  const house = await houseBlueprint.build(seedData);

  if (verbose) {
    console.log('Committing the following house to the database:');
    console.log(util.inspect(house, false, null, true));
  }
};

const main = async () => {
  // Process the CLI options
  const program = createProgramCommands();
  const options = program.parse(process.argv).opts();

  // Load the environment
  // variables
  loadEnvironmentVariables();

  // Connect to the database
  const mongoDbDataSource = createMongoDbDataSource();
  await mongoDbDataSource.initialize();

  console.log('Connected to the database in environment: ' + getEnvironment());

  program.on('option:purge', () => {
    console.log('Purging the database');
  });

  program.on('option:seed', async (seedFile: string) => {
    return await seedDatabase(options, seedFile);
  });

  program.parse();
};

main().then();
