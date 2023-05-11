const pg = require('pg');

module.exports = {
	url:
		process.env.DB_URI ||
		`postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}/${
			process.env.POSTGRES_DB
		}`,
	host: process.env.POSTGRES_HOST,
	dialectModule: pg,
	dialect: 'postgres',
	pool: {
		min: 0,
		max: 10,
		idle: 10000,
	},
	define: {
		underscored: true,
		timestamps: false,
	},
};
