const express = require('express');
const connection = require('../database/connection');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const signInRouter = express.Router();
signInRouter.use(bodyParser.json());

const saltRounds = 10;

signInRouter.route("/user")
    .post((req,res) => {
        try{

            //parse the user_name and password from the body
            user_name = req.body.user_name;
            password = req.body.password;
            if(!user_name || !password){
                res.send({"signedUp":false,"error":"pls send vaild username and password"});
            }else{
                connection.getConnection((err,con) => {
                    if(err) res.send(err);
                    else{

                        con.query(`SELECT * FROM user WHERE user_name='${user_name}'`,(err,result) => {

                            //check if given username does not exists 
                            if(!result[0]){
                                res.send({
                                    "signedIn": false,
                                    "type": "user",
                                    "token": "",
                                    "err": "Invalid Credentails"
                                })
                            }else{
                                
                                //compare the password of given by the user and hash present in the database to check the authenticity of the user
                                bcrypt.compare(password,result[0].password,(err,matched) => {
                                    if(err) res.send(err);
                                    else{
                                        if(matched){

                                            //If password match's then generate a JWT token and send to the client side 
                                            jwt.sign({user_id: result[0].user_id}, process.env.KEY,{expiresIn: '1d'},(err,token) => {
                                                if(err) res.send(err)
                                                else{
                                                    res.send({
                                                        "signedIn": true,
                                                        "type": "user",
                                                        "token": token
                                                    });
                                                    con.release();
                                                }
                                            })
                                        }else{

                                            //If password does not match then notify the client side that authentication failed
                                            res.send({
                                                "signedIn": false,
                                                "type": "user",
                                                "token": "",
                                                "err": "Invalid Credentails"
                                            });
                                            con.release();
                                        }
                                    }
                                })
                            }
                        })
                    }
                })
            }
        }catch(err){
            console.log(err);
            res.send(err);
        }
    });

signInRouter.route('/pharmacy')
.post((req,res) => {
    try{

        //parse the user_name and password from the body
        user_name = req.body.user_name;
        password = req.body.password;
        if(!user_name || !password){
            res.send({"signedUp":false,"error":"pls send vaild username and password"});
        }else{
            connection.getConnection((err,con) => {
                if(err) res.send(err);
                else{
                    con.query(`SELECT * FROM pharmacy WHERE user_name='${user_name}'`,(err,result) => {

                        //check if given username does not exists 
                        if(!result[0]){
                            res.send({
                                "signedIn": false,
                                "type": "pharmacy",
                                "token": "",
                                "err": "Invalid Credentails"
                            })
                        }else{
                            
                            //compare the password of given by the user and hash present in the database to check the authenticity of the user 
                            bcrypt.compare(password,result[0].password,(err,matched) => {
                                if(err) res.send(err);
                                else{
                                    if(matched){
                                        jwt.sign({pharmacy_id: result[0].pharmacy_id}, process.env.KEY,{expiresIn: '1d'},(err,token) => {
                                            if(err) res.send(err)
                                            else{

                                                //If password match's then generate a JWT token and send to the client side 
                                                res.send({
                                                    "signedIn": true,
                                                    "type": "pharmacy",
                                                    "token": token
                                                });
                                            }
                                        })
                                    }else{
                                        
                                        //If password does not match then notify the client side that authentication failed
                                        res.send({
                                            "signedIn": false,
                                            "type": "pharmacy",
                                            "token": "",
                                            "err": "Invalid Credentails"
                                        });
                                    }
                                }
                            })
                        }
                    })
                }
            })
        }
    }catch(err){
        console.log(err);
        res.send(err);
    }
});

module.exports=signInRouter;