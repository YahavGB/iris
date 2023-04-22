import winston, {format, transports} from 'winston';
import {LogstashOption, LogstashTransport} from 'winston-logstash-ts';
import * as os from 'os';
import path from 'path';

const apm = require('elastic-apm-node').start({
  serviceName: 'iris',
  secretToken: 'secrettokengoeshere',
  verifyServerCert: false,
  // https is enabled by default as per elastdocker configuration
  serverUrl: 'https://localhost:8200',
});
const ElasticsearchApm = require('@entropy/winston-elasticsearch-apm');
const ecsFormat = require('@elastic/ecs-winston-format');

export const createLogger = (
  logType: string,
  logstashOption: LogstashOption
) => {
  const appendMetaInfo = winston.format(info => {
    return Object.assign(info, {
      application: logType || logstashOption.application,
      hostname: logstashOption.hostname || os.hostname(),
      pid: process.pid,
      time: new Date(),
      filename: path.basename(__filename),
    });
  });

  return winston.createLogger({
    level: logstashOption.level || 'info',
    format: format.combine(
      format.timestamp(),
      format.splat(),
      format.metadata({fillExcept: ['message', 'level', 'timestamp', 'label']}),
      format.label({label: path.basename(__filename)})
    ),
    transports: [
      new LogstashTransport(
        Object.assign(logstashOption, {
          format: format.combine(
            appendMetaInfo(),
            ecsFormat({convertErr: true, apmIntegration: true})
            // format.logstash(),
            // format.json(),
          ),
        })
      ) as any,
      new transports.Console({
        level: 'info',
        handleExceptions: true,
        handleRejections: true,
        format: winston.format.combine(
          format.colorize(),
          format.simple(),
          format.printf(({timestamp, level, message}) => {
            return `[${timestamp}] ${level}: ${message}`;
          })
        ),
      }),
      new ElasticsearchApm({apm: apm, level: 'info'}),
    ],
  });
};
