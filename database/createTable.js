const connection = require('./connection');

module.exports = () => {
    connection.getConnection((err,con) => {
        if(err) {
            console.log(err);
            con.release();
            throw err;
        } else{
            con.query(`CREATE TABLE IF NOT EXISTS user(
                user_id INT NOT NULL UNIQUE AUTO_INCREMENT,
                user_name VARCHAR(45) NOT NULL UNIQUE,
                password VARCHAR(500) NOT NULL,
                CONSTRAINT user_id_pk PRIMARY KEY (user_id)
              );`, function(err,result) {
                if(err) throw err;
            });

            
            con.query(`CREATE TABLE IF NOT EXISTS pharmacy(
                pharmacy_id INT NOT NULL UNIQUE AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                address VARCHAR(100) NOT NULL,
                contact_no VARCHAR(100) NOT NULL,
                lat DOUBLE NOT NULL,
                lon DOUBLE NOT NULL,
                user_name VARCHAR(45) NOT NULL UNIQUE,
                password VARCHAR(500) NOT NULL,
                CONSTRAINT pharmacy_id_pk PRIMARY KEY (pharmacy_id) 
              );`, function(err,result) {
                if(err) throw err;
            });
            
            con.query(`CREATE TABLE IF NOT EXISTS medicine(
                medicine_id INT NOT NULL UNIQUE AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE,
                CONSTRAINT medicine_id_pk PRIMARY KEY (medicine_id) 
              );`, function(err,result) {
                if(err) throw err;
            });
            
            con.query(`CREATE TABLE IF NOT EXISTS medicine_stock(
                medicine_id INT NOT NULL,
                pharmacy_id INT NOT NULL,
                quantity INT NOT NULL,
                FOREIGN KEY (medicine_id) REFERENCES medicine(medicine_id),
                FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(pharmacy_id)
              );`, function(err,result) {
                if(err) throw err;
            });
            
            con.query(`CREATE TABLE IF NOT EXISTS pharmacy_graph(
                vertex_1 INT NOT NULL,
                vertex_2 INT NOT NULL,
                weight DOUBLE NOT NULL,
                FOREIGN KEY (vertex_1) REFERENCES pharmacy(pharmacy_id),
                FOREIGN KEY (vertex_1) REFERENCES pharmacy(pharmacy_id)
              );`, function(err,result) {
                if(err) throw err;
            });
            con.release();
        }
    })
}