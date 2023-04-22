import dotenv from 'dotenv';
import fs from 'fs';

/**
 * Returns true if the NODE_ENV is not production
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Returns true if the NODE_ENV is production
 */
export const isProduction = () => !isDevelopment();

/**
 * Returns the current NODE_ENV
 */
export const getEnvironment = () => process.env.NODE_ENV || 'N/A';

/**
 * Loads the environment variables from the .env file(s)
 * @throws Error if the required environment file is missing
 */
export const loadEnvironmentVariables = () => {
  const envFile = isProduction() ? '.env.prod' : '.env.dev';
  const envPath = `${process.cwd()}/${envFile}`;

  // Load .env file if it exists
  if (fs.existsSync(envPath)) {
    dotenv.config({path: envPath});
  } else {
    const defaultEnvPath = `${process.cwd()}/.env`;
    if (fs.existsSync(defaultEnvPath)) {
      dotenv.config({path: defaultEnvPath});
    } else {
      const errorMessage = `Environment file "${envFile}" not found nor default "${defaultEnvPath}" file`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
};
