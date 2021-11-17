const express = require('express');
const morgan = require('morgan');
var cors = require('cors');
require('dotenv').config();
const createTable = require('./database/createTable');

const signUpRouter = require('./router/signUpRouter');
const signInRouter = require('./router/signInRouter');
const medicineRouter = require('./router/medicineRouter');

const hostname = 'localhost';
const port = 3000

const app = express();
app.use(morgan('dev'));
app.use(cors());

app.use('/signUp',signUpRouter)
app.use('/signIn',signInRouter)
app.use('/medicine',medicineRouter)

app.get('/', function (req, res) {
    res.send({
      working: true
    });
})
 
app.listen(process.env.PORT || port, () => {
    createTable();
    console.log(`Server running at http://${hostname}:${port}/`);
  });
  