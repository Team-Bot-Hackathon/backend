const express = require('express');
const connection = require('../database/connection');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
var request = require('request');

const signUpRouter = express.Router();
signUpRouter.use(bodyParser.json());

const saltRounds = 10;

function getData(lat1,lon1,lat2,lon2){
    return new Promise(function(resolve,reject){
        var options = {
            'method': 'POST',
            'url': 'http://localhost:3000/getDistance',
            'headers': {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              "lat1":lat1,
              "lon1":lon1,
              "lat2":lat2,
              "lon2":lon2
            })
        };
        request(options,function(err,response) 
        {
            console.log(options);
            try{
                data = JSON.parse(response.body);
                resolve(data.route.distance);
            }catch(err){
                resolve(false);
            }
        });
    })
}


signUpRouter.route("/user")
    .post((req,res) => {
        user_name = req.body.user_name;
        password = req.body.password;
        if(!user_name || !password){
            res.send({"signedUp":false,"error":"pls send vaild username and password"});
        }else{
            bcrypt.hash(password,saltRounds,(err,hash) => {
                if(err) res.send(err)
                else{
                    connection.getConnection((err,con) => {
                        if(err) res.send(err);
                        else{
                            con.query(`INSERT INTO user(\`user_name\`,\`password\`) VALUES('${user_name}','${hash}')`,(err,result) => {
                                if(err) res.send(err);
                                else{
                                    user_id = result.insertId;
                                    jwt.sign({user_id: user_id}, process.env.KEY,{expiresIn: '1d'},(err,token) => {
                                        if(err) res.send(err)
                                        else{
                                            res.send({
                                                "signedUp": true,
                                                "type": "user",
                                                "token": token
                                            });
                                            con.release();
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        }
    });

signUpRouter.route('/pharmacy')
    .post(async(req,res) => {
        user_name = req.body.user_name;
        password = req.body.password;
        name = req.body.name;
        address = req.body.address;
        contact_no = req.body.contact_no;
        lat = req.body.lat;
        lon = req.body.lon;
        if(!user_name || !password){
            res.send({"signedUp":false,"error":"pls send vaild username and password"});
        }else{
            bcrypt.hash(password,saltRounds,(err,hash) => {
                if(err) res.send(err)
                else{
                    connection.getConnection((err,con) => {
                        if(err) res.send(err);
                        else{
                            con.query(`INSERT INTO pharmacy
                                        (\`name\`,\`address\`,\`contact_no\`,\`lat\`,\`lon\`,\`user_name\`,\`password\`)
                                        VALUES('${name}','${address}',${contact_no},${lat},${lon},'${user_name}','${hash}');`,(err,result) => {
                                if(err) res.send(err);
                                else{
                                    pharmacy_id = result.insertId;
                                    jwt.sign({pharmacy_id: pharmacy_id}, process.env.KEY,{expiresIn: '1d'},(err,token) => {
                                        if(err) res.send(err)
                                        else{
                                            res.send({
                                                "signedUp": true,
                                                "type": "pharmacy",
                                                "token": token
                                            });
                                            con.query(`SELECT pharmacy_id,lat,lon FROM pharmacy WHERE pharmacy_id != ${pharmacy_id}`,async(err,pharmacy_data) => {
                                                if(err) res.send(err);
                                                else{
                                                    var distanceLocation = [];
                                                    for(var i=0;i<pharmacy_data.length;i++){
                                                        result = await getData(lat,lon,pharmacy_data[i].lat,pharmacy_data[i].lon);
                                                        if(result){
                                                            distanceLocation.push(result);
                                                        }else{
                                                            distanceLocation.push(-1);
                                                        }
                                                    }
                                                    console.log("Got All Distance",distanceLocation);
                                                    for(var i=0;i<pharmacy_data.length;i++){
                                                        console.log(pharmacy_data[i]);
                                                        target_pharmacy_id = pharmacy_data[i].pharmacy_id;
                                                        weight = distanceLocation[i];
                                                        if(weight == -1){
                                                            continue;
                                                        }
                                                        con.query(`INSERT INTO pharmacy_graph(\`vertex_1\`,\`vertex_2\`,\`weight\`) VALUES (${pharmacy_id},${target_pharmacy_id},${weight})`,(err,result) => {
                                                            if(err){
                                                                res.send(err);
                                                                console.log(err);
                                                            }
                                                        })
                                                        console.log("Added Edges to the pharmacy graph table");
                                                    }
                                                }
                                            })
                                            // con.query(`SELECT pharmacy_id, lat, lon, SQRT(
                                            //            POW(69.1 * (lat - ${lat}), 2) +
                                            //            POW(69.1 * (${lon} - lon) * COS(lat / 57.3), 2)) AS distance
                                            //            FROM pharmacy WHERE pharmacy_id != ${pharmacy_id} ORDER BY distance;`,(err,result) => {
                                            //                if(err) res.send(err);
                                            //                else{
                                            //                    if(result){
                                            //                         for(var i=0;i<result.length;i++){
                                            //                             target_pharmacy_id = result[i].pharmacy_id;
                                            //                             weight = result[i].distance;
                                            //                             con.query(`INSERT INTO pharmacy_graph(\`vertex_1\`,\`vertex_2\`,\`weight\`) VALUES (${pharmacy_id},${target_pharmacy_id},${weight})`,(err,result) => {
                                            //                                 if(err) res.send(err);
                                            //                             })
                                            //                         }
                                            //                         res.send({
                                            //                             "signedUp": true,
                                            //                             "type": "pharmacy",
                                            //                             "token": token
                                            //                         });
                                            //                    }else{
                                            //                         console.log(result);
                                            //                         res.send({
                                            //                             "signedUp": true,
                                            //                             "type": "pharmacy",
                                            //                             "token": token
                                            //                         });
                                            //                    }
                                            //                }
                                            //            })
                                            // con.release();
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        }
    })

module.exports=signUpRouter;