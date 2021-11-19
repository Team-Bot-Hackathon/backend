const express = require('express');
const connection = require('../database/connection');
const bodyParser = require('body-parser');
var request = require('request');

require('dotenv').config();

const getDistanceRouter = express.Router();
getDistanceRouter.use(bodyParser.json());


getDistanceRouter.route("/")
    .post((req,res) => {
        lat1 = req.body.lat1;
        lat2 = req.body.lat2;
        lon1 = req.body.lon1;
        lon2 = req.body.lon2;
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

        request(options, function (error, response) {
            if (error) res.send(error);
            else{
                body = JSON.parse(response.body);
                res.send(body);
            }
        });

    });

module.exports=getDistanceRouter;