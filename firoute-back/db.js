import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
    host: 'localhost', 
    user: 'radius',
    password: 'radius123',
    database: 'radius',
    port: 3306,             
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})
