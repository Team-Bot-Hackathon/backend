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
        user_name = req.body.user_name;
        password = req.body.password;
        if(!user_name || !password){
            res.send({"signedUp":false,"error":"pls send vaild username and password"});
        }else{
            connection.getConnection((err,con) => {
                if(err) res.send(err);
                else{
                    con.query(`SELECT * FROM user WHERE user_name='${user_name}'`,(err,result) => {
                        if(!result[0]){
                            res.send({
                                "signedIn": false,
                                "type": "user",
                                "token": "",
                                "err": "Invalid Credentails"
                            })
                        }else{
                            bcrypt.compare(password,result[0].password,(err,matched) => {
                                if(err) res.send(err);
                                else{
                                    if(matched){
                                        jwt.sign({user_id: result[0].user_id}, process.env.KEY,{expiresIn: '1d'},(err,token) => {
                                            if(err) res.send(err)
                                            else{
                                                res.send({
                                                    "signedIn": true,
                                                    "type": "user",
                                                    "token": token
                                                });
                                            }
                                        })
                                    }else{
                                        res.send({
                                            "signedIn": false,
                                            "type": "user",
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
    });

signInRouter.route('/pharmacy')
.post((req,res) => {
    user_name = req.body.user_name;
    password = req.body.password;
    if(!user_name || !password){
        res.send({"signedUp":false,"error":"pls send vaild username and password"});
    }else{
        connection.getConnection((err,con) => {
            if(err) res.send(err);
            else{
                con.query(`SELECT * FROM pharmacy WHERE user_name='${user_name}'`,(err,result) => {
                    if(!result[0]){
                        res.send({
                            "signedIn": false,
                            "type": "pharmacy",
                            "token": "",
                            "err": "Invalid Credentails"
                        })
                    }else{
                        bcrypt.compare(password,result[0].password,(err,matched) => {
                            if(err) res.send(err);
                            else{
                                if(matched){
                                    jwt.sign({pharmacy_id: result[0].pharmacy_id}, process.env.KEY,{expiresIn: '1d'},(err,token) => {
                                        if(err) res.send(err)
                                        else{
                                            res.send({
                                                "signedIn": true,
                                                "type": "pharmacy",
                                                "token": token
                                            });
                                        }
                                    })
                                }else{
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
});

module.exports=signInRouter;