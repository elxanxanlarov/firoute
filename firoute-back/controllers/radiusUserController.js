import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
export const getUsers = async (req,res) =>{
    try {
        const [rows] = await pool.query(
            'SELECT id, username,attribute, op, value FROM radcheck LIMIT 50'
        );
        res.json(rows);
    } catch (error) {
        console.error( 'Users fetch error:', error);
        res.status(500).json({ error: 'Users fetch error'});
    }
}

export const createUser = async (req,res) =>{
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res 
            .status(400)
            .json ({ error: 'Username and password are required'});
        }
        
        const id = uuidv4();
        const [result] = await pool.query(
            `INSERT INTO radcheck (id, username, attribute, op, value)
             VALUES (?, ?, 'Cleartext-Password', ':=', ?)`,
             [id, username, password]
        )

        res.status(201).json({
            id,
            username,
            attribute: 'Cleartext-Password',
            op: ':=',
            value: password
        })
    } catch (error) {
        console.error('User create error:', error);
        res.status(500).json({ error: 'User create error'});
    }
}

export const deleteUser = async (req,res) =>{
    try {
        const { id }=req.params;
        const [result] = await pool.query(
            'DELETE FROM radcheck WHERE id = ?',
            [id]
        )
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found'});
        } 
        res.json({ success: true});
    } catch (error) {
        console.error('User delete error:', error);
        res.status(500).json({ error: 'User delete error'});
    }
}