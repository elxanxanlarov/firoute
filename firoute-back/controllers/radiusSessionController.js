import { pool } from '../db.js';

export const getSessions = async (req, res ) => {
    try {
        const [rows] = await pool.query(
            `SELECT 
             username,
             callingstationid AS mac,
             framedipaddress AS ip,
             acctstarttime,
             acctstoptime
             FROM radacct 
             ORDER BY acctstarttime DESC
             LIMIT 50            `
        );
        res.json (rows);
    } catch (error) {
        console.error('Sessions fetch error:', error);
        res.status(500).json({ error: 'Sessions fetch error'});
    }
}