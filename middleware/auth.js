const jwt = require("jsonwebtoken");
require('dotenv').config();

module.exports = function (req, res, next) {
    const token = req.header("token");
    if (!token) return res.status(401).json({ message: "Auth Error" });

    try {
        const decoded = jwt.verify(token, process.env.KEY);
        console.log(decoded);
        req.decoded_value = decoded;
        next();
    } catch (e) {
        console.error(e);
        res.status(500).send({ message: "Invalid Token" });
    }
};