const express = require('express');
const connection = require('../database/connection');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
require('dotenv').config();

const medicineRouter = express.Router();
medicineRouter.use(bodyParser.json());

const saltRounds = 10;

function addMedicine(con,res,medicine_id,pharmacy_id,quantity){
    con.query(`SELECT * FROM medicine_stock WHERE medicine_id=${medicine_id} AND pharmacy_id=${pharmacy_id}`,(err,result) => {
        if(!result[0]){
            con.query(`INSERT INTO medicine_stock(\`medicine_id\`,\`pharmacy_id\`,\`quantity\`) VALUES (${medicine_id},${pharmacy_id},${quantity})`,(err,result1) =>{
                if(err) res.send(err);
                else{
                    res.send({"action":true});
                }
            })
            con.release();
        }else{
            present_quantity = result[0].quantity;
            con.query(`UPDATE medicine_stock SET quantity=${present_quantity+quantity} WHERE pharmacy_id=${pharmacy_id} AND medicine_id=${medicine_id}`,(err,results1) => {
                if(err) res.send(err);
                else{
                    res.send({"action":true});
                }               
            })
            con.release();
        }
    })
}

medicineRouter.route("/")
    .get((req,res) => {

    });


medicineRouter.route("/add")
    .post(auth,async (req,res) => {
        pharmacy_id = req.decoded_value.pharmacy_id;
        medicine_name = req.body.name;
        quantity = req.body.quantity;
        if(!pharmacy_id){
            res.status(401).send({"action":false})
        }
        else{
            connection.getConnection((err,con) => {
                if(err) res.send(err);
                else{
                    con.query(`SELECT * FROM medicine WHERE name='${medicine_name}'`,(err,result) => {
                        if(err) res.send(err);
                        else{
                            if(!result[0]){
                                con.query(`INSERT INTO medicine(\`name\`) VALUES('${medicine_name}')`,(err,result) => {
                                    if(err) res.send(err);
                                    else{
                                        medicine_id = result.insertId;
                                        addMedicine(con,res,medicine_id,pharmacy_id,quantity);
                                    }
                                })
                            }else{
                                medicine_id = result[0].medicine_id;
                                addMedicine(con,res,medicine_id,pharmacy_id,quantity);
                            }
                        }
                    });
                }
            })
        }
    });

medicineRouter.route('/update')
    .post((req,res) => {
        
    });

module.exports=medicineRouter;