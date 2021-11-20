var mysql = require('mysql');
require('dotenv').config();

var connection = mysql.createPool({
    connectionLimit: 1000,
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "database"
});

module.exports = connection;