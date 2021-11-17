const express = require('express');
const morgan = require('morgan');
var cors = require('cors');
const createTable = require('./database/createTable');

const hostname = 'localhost';
const port = 3000

const app = express();
app.use(morgan('dev'));
app.use(cors());

app.get('/', function (req, res) {
    res.send({
      working: true
    });
})
 
app.listen(process.env.PORT || port, () => {
    createTable();
    console.log(`Server running at http://${hostname}:${port}/`);
  });
  