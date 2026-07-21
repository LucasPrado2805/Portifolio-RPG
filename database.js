require('dotenv').config({ override: true });
const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rpg2026',
    user: 'postgres',
    password: process.env.DB_PASSWORD
});

client.connect();

module.exports = client;