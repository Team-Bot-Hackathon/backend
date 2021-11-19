const express = require('express');
const connection = require('../database/connection');
const bodyParser = require('body-parser');
const auth = require('../middleware/auth');
const MST = require('../MST/kruskal');
var solver = require('node-tspsolver');

require('dotenv').config();

const medicineRouter = express.Router();
medicineRouter.use(bodyParser.json());

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
        connection.getConnection((err,con) => {
            if(err) res.send(err);
            else{
                con.query(`SELECT * FROM medicine`,(err,result) => {
                    if(err) res.send(err);
                    else{
                        res.send({data: result});
                    }
                })
            }
        })
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
    .post(auth, async(req,res) => {
        pharmacy_id = req.decoded_value.pharmacy_id;
        medicine_name = req.body.name;
        quantity = req.body.quantity;
        if(!pharmacy_id){
            res.status(401).send({"action":false})
        }
        connection.getConnection((err,con) => {
            if(err) res.send(err);
            else{
                con.query(`SELECT * FROM medicine WHERE name='${medicine_name}'`,(err,result) => {
                    if(!result[0]){
                        res.send({
                            "action":false,
                            "err": "Invalid Medicine Name"
                        });
                    }
                    medicine_id = result[0].medicine_id;
                    con.query(`UPDATE medicine_stock
                               SET \`quantity\` = ${quantity}
                               WHERE medicine_id=${medicine_id} AND pharmacy_id=${pharmacy_id};`,(err,result) => {
                                   if(err) res.send(err);
                                   else{
                                       res.send({
                                           "action": true
                                       })
                                   }
                    })
                })
            }
        })
    });


medicineRouter.route('/list')
    .get(auth, async(req,res) => {
        pharmacy_id = req.decoded_value.pharmacy_id;
        if(!pharmacy_id){
            res.status(401).send({"action":false})
        }
        connection.getConnection((err,con) => {
            if(err) res.send(err);
            else{
                con.query(`SELECT * FROM medicine_stock INNER JOIN medicine ON medicine_stock.medicine_id = medicine.medicine_id WHERE pharmacy_id=${pharmacy_id}`,(err,result) => {
                    if(err) res.send(err);
                    else{
                        res.send({data: result});
                    }                    
                })
            }
        })
    });

medicineRouter.route('/find')
    .post((req,res) => {
        medicine_id = req.body.medicine_id;
        lat  = req.body.lat;
        lon = req.body.lon;
        connection.getConnection((err,con) => {
            if(err) res.send(err);
            else{
                con.query(`SELECT * FROM pharmacy_graph WHERE vertex_1 IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id}) AND vertex_2 IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id})`,(err,result) => {
                    if(!result){
                    }else{
                        con.query(`SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id}`,(err,result1) => {
                            if(err) res.send(err);
                            else{
                                if(!result){
                                }else{
                                    pharmacy_id = result1;
                                    console.log(result1);
                                    vertex_matrix = Array(pharmacy_id.length).fill(null).map(() => Array(pharmacy_id.length).fill(0));
                                    for(var i=0;i<result.length;i++){
                                        vertex_matrix[result1.findIndex(item => item.pharmacy_id === result[i].vertex_1)][result1.findIndex(item => item.pharmacy_id === result[i].vertex_2)] = result[i].weight;
                                        vertex_matrix[result1.findIndex(item => item.pharmacy_id === result[i].vertex_2)][result1.findIndex(item => item.pharmacy_id === result[i].vertex_1)] = result[i].weight;
                                    }
                                    solver.solveTsp(vertex_matrix,true,{}).then(
                                        function(result2){
                                            for(var i=0;i<result2.length;i++){
                                                console.log(result1[result2[i]].pharmacy_id);
                                            }
                                            console.log(result2);
                                            res.send(result2);
                                        }
                                    )
                                }
                            }
                        })
                        console.log(result);
                        // var spanningTree = MST.kruskal(result);
                        // res.send(spanningTree);
                        // con.query(`SELECT pharmacy_id, lat, lon, SQRT(
                        //         POW(69.1 * (lat - ${lat}), 2) +
                        //         POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance
                        //         FROM pharmacy WHERE pharmacy_id IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id})  ORDER BY distance LIMIT 1;`,(err,result1) => {
                        //             if(err) res.send(err);
                        //             else{
                        //                 pharmacy_id = result1[0].pharmacy_id;

                        //                 console.log();
                        //             }
                        // });
                    }
                })
            }
        })
    });

module.exports=medicineRouter;