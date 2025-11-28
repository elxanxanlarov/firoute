import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
export const getNasList = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECR id, nasname, shortname, type, secret FROM nas'
        );
        res.json(rows);
    } catch (error){
        console.error( 'NAS fetch error:', error);
        res.status(500).json({ error: 'NAS fetch error'});
    }
}


export const createNas = async (req, res) => {
    try {
        const { name, ip, port, interfaceName, secret } = req.body;
        
        if( !ip || !secret){
            return res
            .status(400)
            .json({ error: 'IP and secret are required'});
        }

        const id = uuidv4();

        const [result] = await pool.query(
            `INSERT INTO nas (id, nasname, shortname, ports, type, secret, description) 
            VALUES (?, ?, ?, 'other', ?, ?)`,
            [id, name, port || null, secret, interfaceName || null]  
        )
        res.status(201).json({
            id: result.insertId,
            nasname: ip,
            shortname: shortname || ip,
            type: 'other',
            secret
        })
    } catch (error) {
        console.error('NAS create error:', error);
        res.status(500).json({ error: 'NAS create error'});
    }
}
