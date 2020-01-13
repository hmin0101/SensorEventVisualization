const mysql = require('mysql2/promise');

module.exports = function() {
    return {
        init: function() {
            return mysql.createPool({
                host: 'localhost',
                port: 3306,
                user: 'root',
                password: '',
                database: 'sensorsdb',
            });
        },
        connection: function(conn) {
            conn.getConnection(function(err) {
                if (err) {
                    console.error('MySQL Connection Error : ' + err);
                } else {
                    console.info('MySQL is Connected Successfully');
                }
            });
        },

    }
};