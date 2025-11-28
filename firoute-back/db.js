import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
    host: '192.168.186.133', 
    user: 'radiusadmin',
    password: 'radiuspass123',
    database: 'radius',
    port: 3306,             
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})