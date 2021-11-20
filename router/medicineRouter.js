const express = require('express');
const connection = require('../database/connection');
const bodyParser = require('body-parser');
const auth = require('../middleware/auth');
const MST = require('../MST/kruskal');
var solver = require('node-tspsolver');

require('dotenv').config();

const medicineRouter = express.Router();
medicineRouter.use(bodyParser.json());

//Function to add medicine stock to a pharmacy shop 
function addMedicine(con,res,medicine_id,pharmacy_id,quantity){

    //First we check if the medicine stock is present in the database
    con.query(`SELECT * FROM medicine_stock WHERE medicine_id=${medicine_id} AND pharmacy_id=${pharmacy_id}`,(err,graph_edge_result) => {
        if(!graph_edge_result[0]){

            //if stock no present then directly add them
            con.query(`INSERT INTO medicine_stock(\`medicine_id\`,\`pharmacy_id\`,\`quantity\`) VALUES (${medicine_id},${pharmacy_id},${quantity})`,(err,pharmacy_shop_id_result) =>{
                if(err) res.send(err);
                else{
                    res.send({"action":true});
                }
            })
            con.release();
        }else{

            //if stock is present then add the quantity to the previous stock quantity and save it.
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
                //Sends the list of all medicine present in the database
                con.query(`SELECT * FROM medicine`,(err,medicine_name) => {
                    if(err) res.send(err);
                    else{
                        res.send({data: medicine_name});
                    }
                })
            }
        })
    });


medicineRouter.route("/add")
    .post(auth,async (req,res) => {
        try{
            
            //parse the data from the body
            pharmacy_id = +req.decoded_value.pharmacy_id;
            medicine_name = req.body.name;
            quantity = +req.body.quantity;
            if(!pharmacy_id){
                res.status(401).send({"action":false})
            }
            else{
                connection.getConnection((err,con) => {
                    if(err) res.send(err);
                    else{

                        //Get the medicine id from this query
                        con.query(`SELECT * FROM medicine WHERE name='${medicine_name}'`,(err,result) => {
                            if(err) res.send(err);
                            else{
                                if(!result[0]){

                                    //if medicine name is not present then add the medicine name to the database
                                    con.query(`INSERT INTO medicine(\`name\`) VALUES('${medicine_name}')`,(err,result) => {
                                        if(err) res.send(err);
                                        else{

                                            //add the medicine stock to the pharmacy shop
                                            medicine_id = result.insertId;
                                            addMedicine(con,res,medicine_id,pharmacy_id,quantity);
                                        }
                                    })
                                }else{

                                    //add the medicine stock to the pharmacy shop
                                    medicine_id = result[0].medicine_id;
                                    addMedicine(con,res,medicine_id,pharmacy_id,quantity);
                                }
                            }
                        });
                    }
                })
            }
        }catch(err){
            console.log(err);
            res.send(err);
        }
    });

medicineRouter.route('/update')
    .post(auth, async(req,res) => {

        //parse the data from the body
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
                    
                    //If Stock is updated to 0 then remove the tuple from the medicine_stock table
                    if(quantity == 0){
                        con.query(`DELETE FROM medicine_stock WHERE medicine_id=${medicine_id} AND pharmacy_id=${pharmacy_id}`,(err,result) => {
                            if(err) res.send(err);
                            else{
                                res.send({
                                    "action": true
                                })
                            }
                        })

                    }else{

                        con.query(`SELECT * FROM medicine_stock WHERE medicine_id=${medicine_id} AND pharmacy_id=${pharmacy_id};`,(err,result) => {
                            if(err) res.send(err);
                            else{
                                console.log(result);
                                if(result.length > 0){
                                    //Update the stock of the medicine in a pharmacy shop
                                    con.query(`UPDATE medicine_stock
                                    SET \`quantity\` = ${quantity}
                                    WHERE medicine_id=${medicine_id} AND pharmacy_id=${pharmacy_id};`,(err,result1) => {
                                        if(err) res.send(err);
                                        else{
                                            res.send({
                                                "action": true
                                            })
                                        }
                                    })
                                }else{
                                    res.send({
                                        "action": false,
                                        "err": "Medicine Stock Not present in pharmacy shop"
                                    })
                                }
                            }
                        })
                    }
                })
            }
        })
    });


medicineRouter.route('/list')
    .get(auth, async(req,res) => {
        try{
            pharmacy_id = req.decoded_value.pharmacy_id;
            if(!pharmacy_id){
                res.status(401).send({"action":false})
            }
            connection.getConnection((err,con) => {
                if(err) res.send(err);
                else{

                    //Gives the list of all medicine stock of the pharmacy 
                    con.query(`SELECT * FROM medicine_stock INNER JOIN medicine ON medicine_stock.medicine_id = medicine.medicine_id WHERE pharmacy_id=${pharmacy_id}`,(err,result) => {
                        if(err) res.send(err);
                        else{
                            res.send({data: result});
                        }                    
                    })
                }
            })
        }catch(err){
            console.log(err);
            res.send(err);
        }
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

                //Get all the graph edges whose both the vertex have a distance less than 100km from the user and also has the required medicine
                con.query(`SELECT vertex_1,vertex_2, weight FROM pharmacy_graph x INNER JOIN (SELECT pharmacy.pharmacy_id, SQRT(
                    POW(69.1 * (lat - ${lat}), 2) +
                    POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance
                    FROM pharmacy) y1
                    ON x.vertex_1 = y1.pharmacy_id
                    INNER JOIN (SELECT pharmacy.pharmacy_id, SQRT(
                    POW(69.1 * (lat - ${lat}), 2) +
                    POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance
                    FROM pharmacy) y2
                    ON x.vertex_2 = y2.pharmacy_id
                    WHERE y1.distance < 100 AND y2.distance < 100 AND vertex_1 IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id}) AND vertex_2 IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id = ${medicine_id});`,(err,graph_edge_result) => {
                    if(graph_edge_result.length == 0){

                        //Check if one pharamcy shop has the medicine
                        con.query(`SELECT pharmacy.name,pharmacy.pharmacy_id,medicine_stock.quantity,medicine_stock.medicine_id,pharmacy.address,pharmacy.lat,pharmacy.lon,pharmacy.contact_no FROM medicine_stock INNER JOIN pharmacy ON medicine_stock.pharmacy_id = pharmacy.pharmacy_id WHERE medicine_stock.medicine_id=8 `,(err,result) => {
                            if(err) res.send(err);
                            else{
                                if(result.length==0){
                                    //If no edge present that means no pharmacy shop has the medicine which is close to it
                                    res.send({"action":false,"message":"No pharmacy Has the medicine which is close to the user"});
                                }else{

                                    //If the pharamcy exists then send its data
                                    var payload = {
                                        shop: result[0],
                                        graph: {},
                                        path: [result[0].pharmacy_id],
                                    }
                                    res.send(payload);
                                }
                            }
                        })
                    }else{

                        //Select the closest pharmacy shop to the user which has the required medicine
                        con.query(`SELECT pharmacy.pharmacy_id, lat, lon,medicine_id, SQRT(
                            POW(69.1 * (lat - ${lat}), 2) +
                            POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance
                            FROM pharmacy INNER JOIN medicine_stock ON medicine_stock.pharmacy_id=pharmacy.pharmacy_id WHERE pharmacy.pharmacy_id IN (SELECT pharmacy_id FROM medicine_stock WHERE medicine_id =  ${medicine_id} ) AND medicine_id = ${medicine_id} ORDER BY distance LIMIT 1;`,(err,closest_pharmacy_data) => {
                            if(err) res.send(err);
                            else{
                                closest_pharmacy = closest_pharmacy_data[0].pharmacy_id;
                                console.log(closest_pharmacy);

                                //Select all those pharmacy shop which has the medicine and are at less than 100km from the user
                                con.query( `SELECT x.pharmacy_id FROM medicine_stock x INNER JOIN (SELECT pharmacy.pharmacy_id, SQRT(
                                    POW(69.1 * (lat - ${lat}), 2) +
                                     POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance FROM pharmacy) y
                                     ON x.pharmacy_id = y.pharmacy_id WHERE y.distance < 100 AND medicine_id = ${medicine_id};`,(err,pharmacy_shop_id_result) => {
                                    if(err) res.send(err);
                                    else{
                                        if(!graph_edge_result){
                                            res.send({action:false,err:"Medicine Not Available"});
                                        }else{

                                            //Set the first closest pharamcy shop as the source
                                            if(pharmacy_shop_id_result.length > 1){
                                                required_index = pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === closest_pharmacy);
                                                value_at_0_index = pharmacy_shop_id_result[0];
                                                pharmacy_shop_id_result[0] = pharmacy_shop_id_result[required_index];
                                                pharmacy_shop_id_result[required_index] = value_at_0_index;
                                            }

                                            //Create a NULL graph using 2D matrix
                                            vertex_matrix = Array(pharmacy_shop_id_result.length).fill(null).map(() => Array(pharmacy_shop_id_result.length).fill(0));
                                            console.log(pharmacy_shop_id_result,vertex_matrix,graph_edge_result);

                                            //Conver the edges of the graph into the 2D matrix graph 
                                            for(var i=0;i<graph_edge_result.length;i++){
                                                vertex_matrix[pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === graph_edge_result[i].vertex_1)][pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === graph_edge_result[i].vertex_2)] = graph_edge_result[i].weight;
                                                vertex_matrix[pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === graph_edge_result[i].vertex_2)][pharmacy_shop_id_result.findIndex(item => item.pharmacy_id === graph_edge_result[i].vertex_1)] = graph_edge_result[i].weight;
                                            }
                                            path_of_vertex = [];
                                            edges_of_vertex = [];

                                            //we apply the travelling salesman problem to the matrix graph to get the path, in which user has to travel the least to cover all pharmacy shop 
                                            solver.solveTsp(vertex_matrix,true,{}).then(
                                                function(result2){

                                                    //Save the path in the path_of_vertex array
                                                    for(var i=0;i<result2.length;i++){
                                                        path_of_vertex.push(pharmacy_shop_id_result[result2[i]].pharmacy_id);
                                                    }

                                                    //Save the edges of the grpah in the edges_of_vertex array
                                                    for(var i=0;i<graph_edge_result.length;i++){
                                                        if(path_of_vertex[path_of_vertex.indexOf(graph_edge_result[i].vertex_1)+1] === graph_edge_result[i].vertex_2 || path_of_vertex[path_of_vertex.indexOf(graph_edge_result[i].vertex_2)+1] === graph_edge_result[i].vertex_1){
                                                            edges_of_vertex.push(graph_edge_result[i]);
                                                        }
                                                    }

                                                    //Select all those pharamcy shop which has the required medicine and are is at a distance less than 100km from the user
                                                    con.query(`SELECT medicine_stock.medicine_id,medicine_stock.pharmacy_id,quantity,medicine.name,pharmacy.name, pharmacy.address,contact_no,lat,lon FROM medicine_stock 
                                                    INNER JOIN medicine ON medicine_stock.medicine_id = medicine.medicine_id 
                                                    INNER JOIN pharmacy ON medicine_stock.pharmacy_id = pharmacy.pharmacy_id 
                                                    INNER JOIN (SELECT pharmacy.pharmacy_id, SQRT(POW(69.1 * (lat - ${lat}), 2) +  POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance FROM pharmacy) y ON medicine_stock.pharmacy_id = y.pharmacy_id 
                                                    WHERE medicine_stock.medicine_id=${medicine_id} AND y.distance < 100;`,(err,pharmacy_shop_with_medicine) => {
                                                                   if(err) res.send(err);
                                                                   else{
                                                                       var payload = {
                                                                           shop: pharmacy_shop_with_medicine,
                                                                           graph:edges_of_vertex,
                                                                           path: path_of_vertex,
                                                                       }
                                                                       res.send(payload);
                                                                   }
                                                               })
                                                }
                                            )
                                        }
                                    }
                                });
                            }
                        })
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