var mysql = require('mysql');

var connection = mysql.createPool({
    connectionLimit: 1000,
    host: "localhost",
    user: "root",
    password: "password",
    database: "database"
});

module.exports = connection;