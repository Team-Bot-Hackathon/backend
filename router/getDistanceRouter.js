const express = require('express');
const connection = require('../database/connection');
const bodyParser = require('body-parser');
var request = require('request');

require('dotenv').config();

const getDistanceRouter = express.Router();
getDistanceRouter.use(bodyParser.json());

function calculateDistance(lat1, lon1, lat2, lon2) 
    {
    var R = 6371; 
    var dLat = toRad(lat2-lat1);
    var dLon = toRad(lon2-lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c;
    return d;
}


function toRad(Value) 
{
    return Value * Math.PI / 180;
}

getDistanceRouter.route("/")
    .post((req,res) => {
        try{
            lat1 = +(req.body.lat1);
            lat2 = +(req.body.lat2);
            lon1 = +(req.body.lon1);
            lon2 = +(req.body.lon2);
            var options = {
                'method': 'POST',
                'url': 'http://www.mapquestapi.com/directions/v2/route?key='+process.env.API_KEY,
                'headers': {
                'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "locations": [
                        ""+lat1+", "+lon1+"",
                        ""+lat2+", "+lon2+""
                    ],
                    "options": {
                        "avoids": [],
                        "avoidTimedConditions": false,
                        "doReverseGeocode": false,
                        "shapeFormat": "raw",
                        "generalize": 0,
                        "routeType": "fastest",
                        "timeType": 1,
                        "locale": "en_US",
                        "unit": "k",
                        "enhancedNarrative": false,
                        "drivingStyle": 2,
                        "highwayEfficiency": 21
                    }
                })
            };

            if(calculateDistance(lat1,lon1,lat2,lon2) > 100){
                payload = {
                    route:{
                        distance: calculateDistance(lat1,lon1,lat2,lon2)
                    }
                }
                body= payload;
                res.send(body);
            }else{
                request(options, function (error, response) {
                    if (error) res.send(error);
                    else{
                        body = JSON.parse(response.body);
                        if(body['fault']){
                            payload = {
                                route:{
                                    distance: calculateDistance(lat1,lon1,lat2,lon2)
                                }
                            }
                            body= payload;
                            res.send(body);
                            
                        }
                        else if(body['route']['routeError']['errorCode'] == -400){
                            res.send(body);
                        }else{
                            payload = {
                                route:{
                                    distance: calculateDistance(lat1,lon1,lat2,lon2)
                                }
                            }
                            body=payload;
                            res.send(body);
                        }
                    }
                });
            }
        }catch(err){
            res.send(err);
        }

    });

module.exports=getDistanceRouter;