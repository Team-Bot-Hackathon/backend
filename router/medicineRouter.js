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
    con.query(`SELECT * FROM medicine_stock WHERE medicine_id=${medicine_id} AND pharmacy_id=${pharmacy_id}`,(err,graph_edge_result) => {
        if(!graph_edge_result[0]){
            con.query(`INSERT INTO medicine_stock(\`medicine_id\`,\`pharmacy_id\`,\`quantity\`) VALUES (${medicine_id},${pharmacy_id},${quantity})`,(err,pharmacy_shop_id_result) =>{
                if(err) res.send(err);
                else{
                    res.send({"action":true});
                }
            })
            con.release();
        }else{
            present_quantity = graph_edge_result[0].quantity;
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
                con.query(`SELECT * FROM medicine`,(err,graph_edge_result) => {
                    if(err) res.send(err);
                    else{
                        res.send({data: graph_edge_result});
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
                    con.query(`SELECT * FROM medicine WHERE name='${medicine_name}'`,(err,graph_edge_result) => {
                        if(err) res.send(err);
                        else{
                            if(!graph_edge_result[0]){
                                con.query(`INSERT INTO medicine(\`name\`) VALUES('${medicine_name}')`,(err,graph_edge_result) => {
                                    if(err) res.send(err);
                                    else{
                                        medicine_id = graph_edge_result.insertId;
                                        addMedicine(con,res,medicine_id,pharmacy_id,quantity);
                                    }
                                })
                            }else{
                                medicine_id = graph_edge_result[0].medicine_id;
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
                con.query(`SELECT * FROM medicine WHERE name='${medicine_name}'`,(err,graph_edge_result) => {
                    if(!graph_edge_result[0]){
                        res.send({
                            "action":false,
                            "err": "Invalid Medicine Name"
                        });
                    }
                    medicine_id = graph_edge_result[0].medicine_id;
                    con.query(`UPDATE medicine_stock
                               SET \`quantity\` = ${quantity}
                               WHERE medicine_id=${medicine_id} AND pharmacy_id=${pharmacy_id};`,(err,graph_edge_result) => {
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
                con.query(`SELECT * FROM medicine_stock INNER JOIN medicine ON medicine_stock.medicine_id = medicine.medicine_id WHERE pharmacy_id=${pharmacy_id}`,(err,graph_edge_result) => {
                    if(err) res.send(err);
                    else{
                        res.send({data: graph_edge_result});
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
        closest_pharmacy = 3;
        connection.getConnection((err,con) => {
            if(err) res.send(err);
            else{
                con.query(`SELECT * FROM pharmacy_graph WHERE vertex_1 IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id}) AND vertex_2 IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id})`,(err,graph_edge_result) => {
                    if(!graph_edge_result){
                    }else{
                        con.query(`SELECT pharmacy_id, lat, lon, SQRT(
                            POW(69.1 * (lat - ${lat}), 2) +
                            POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance
                            FROM pharmacy WHERE pharmacy_id IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = 6) ORDER BY distance LIMIT 1;`,(err,closest_pharmacy_data) => {
                            if(err) res.send(err);
                            else{
                                closest_pharmacy = closest_pharmacy_data[0].pharmacy_id;
                                console.log(closest_pharmacy);
                                con.query(`SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id}`,(err,pharmacy_shop_id_result) => {
                                    if(err) res.send(err);
                                    else{
                                        if(!graph_edge_result){
                                        }else{
                                            required_index = pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === closest_pharmacy);
                                            value_at_0_index = pharmacy_shop_id_result[0];
                                            pharmacy_shop_id_result[0] = pharmacy_shop_id_result[required_index];
                                            pharmacy_shop_id_result[required_index] = value_at_0_index;
                                            console.log(pharmacy_shop_id_result);
                                            vertex_matrix = Array(pharmacy_shop_id_result.length).fill(null).map(() => Array(pharmacy_shop_id_result.length).fill(0));
                                            for(var i=0;i<graph_edge_result.length;i++){
                                                vertex_matrix[pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === graph_edge_result[i].vertex_1)][pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === graph_edge_result[i].vertex_2)] = graph_edge_result[i].weight;
                                                vertex_matrix[pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === graph_edge_result[i].vertex_2)][pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === graph_edge_result[i].vertex_1)] = graph_edge_result[i].weight;
                                            }
                                            path_of_vertex = [];
                                            edges_of_vertex = [];
                                            solver.solveTsp(vertex_matrix,true,{}).then(
                                                function(result2){
                                                    for(var i=0;i<result2.length;i++){
                                                        path_of_vertex.push(pharmacy_shop_id_result[result2[i]].pharmacy_id);
                                                    }
                                                    for(var i=0;i<graph_edge_result.length;i++){
                                                        if(path_of_vertex[path_of_vertex.indexOf(graph_edge_result[i].vertex_1)+1] === graph_edge_result[i].vertex_2 || path_of_vertex[path_of_vertex.indexOf(graph_edge_result[i].vertex_2)+1] === graph_edge_result[i].vertex_1){
                                                            edges_of_vertex.push(graph_edge_result[i]);
                                                        }
                                                    }
                                                    con.query(`SELECT medicine_stock.medicine_id,medicine_stock.pharmacy_id,quantity,medicine.name,pharmacy.name, pharmacy.address,contact_no,lat,lon FROM medicine_stock 
                                                               INNER JOIN medicine ON medicine_stock.medicine_id = medicine.medicine_id 
                                                               INNER JOIN pharmacy ON medicine_stock.pharmacy_id = pharmacy.pharmacy_id 
                                                               WHERE medicine_stock.medicine_id=${medicine_id};`,(err,pharmacy_shop_with_medicine) => {
                                                                   if(err) res.send(err);
                                                                   else{
                                                                       var payload = {
                                                                           shop: pharmacy_shop_with_medicine,
                                                                           graph:edges_of_vertex,
                                                                           path: path_of_vertex,
                                                                       }
                                                                       res.send(payload);
                                                                        console.log(path_of_vertex,edges_of_vertex,pharmacy_shop_with_medicine);
                                                                   }
                                                               })
                                                }
                                            )
                                        }
                                    }
                                });
                            }
                        })
                        console.log(graph_edge_result);
                        // var spanningTree = MST.kruskal(graph_edge_result);
                        // res.send(spanningTree);
                        // con.query(`SELECT pharmacy_id, lat, lon, SQRT(
                        //         POW(69.1 * (lat - ${lat}), 2) +
                        //         POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance
                        //         FROM pharmacy WHERE pharmacy_id IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id})  ORDER BY distance LIMIT 1;`,(err,pharmacy_shop_id_result) => {
                        //             if(err) res.send(err);
                        //             else{
                        //                 pharmacy_id = pharmacy_shop_id_result[0].pharmacy_id;

                        //                 console.log();
                        //             }
                        // });
                    }
                })
            }
        })
    });

module.exports=medicineRouter;