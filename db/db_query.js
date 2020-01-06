// Promise
const mysql_dbc = require('./db_config')();
const mysql = mysql_dbc.init();
mysql_dbc.connection(mysql);

exports.asyncQuery = async (query) => {
    try {
        const connection = await mysql.getConnection();
        try {
            await connection.beginTransaction();                // Start Transaction
            const [rows] = await connection.query(query);
            await  connection.commit();                         // Commit
            connection.release();

            return {result: true, message: rows};
        } catch (err) {
            return {result: false, message: err.message};
        }
    } catch (err) {
        return {result: false, message: err.message};
    }
};

exports.asyncSelect = async (query) => {
    try {
        const connection = await mysql.getConnection();
        try {
            const [rows] = await connection.query(query);
            connection.release();

            return {result: true, message: rows};
        } catch (err) {
            connection.release();
            return {result: false, message: err.message};
        }
    } catch (err) {
        return {result: false, message: err.message};
    }
};

exports.asyncBulk = async (query, bulk) => {
    try {
        const connection = await mysql.getConnection();
        try {
            const [rows] = await connection.query(query, [bulk]);
            connection.release();

            return {result: true, message: rows};
        } catch (err) {
            connection.release();
            return {result: false, message: err.message};
        }
    } catch (err) {
        return {result: false, message: err.message};
    }
};

exports.query = async function(query){
    try {
        const connection = await mysql.getConnection();
        try {
            await connection.beginTransaction();                // Start Transaction
            const [rows] = await connection.query(query);
            await  connection.commit();                         // Commit
            connection.release();

            return {result: true, message: rows};
        } catch (err) {
            return {result: false, message: err.message};
        }
    } catch (err) {
        return {result: false, message: err.message};
    }
};

