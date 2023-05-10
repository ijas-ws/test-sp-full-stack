const Sequelize = require('sequelize');
const mysql2 = require('mysql2');
const dotenv = require('dotenv');

dotenv.config({ path: `.env.${process.env.ENVIRONMENT_NAME}` });

module.exports = {
  url:
    process.env.DB_URI ||
    `mysql://${process.env.MYSQL_USER}:${process.env.MYSQL_PASSWORD}@${process.env.MYSQL_HOST}/${
      process.env.MYSQL_DATABASE
    }`,
  host: process.env.MYSQL_HOST,
  dialectModule: mysql2,
  dialect: 'mysql',
  pool: {
    min: 0,
    max: 10,
    idle: 10000
  },
  define: {
    underscored: true,
    timestamps: false
  },
  retry: {
    match: [
      'unknown timed out',
      Sequelize.TimeoutError,
      'timed',
      'timeout',
      'TimeoutError',
      'Operation timeout',
      'refuse',
      'SQLITE_BUSY'
    ],
    max: 10 // maximum amount of tries.
  }
};
