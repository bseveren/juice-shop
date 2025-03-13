import express from 'express';
import pool from '../database';

const router = express.Router();

router.get('/records', async (req, res) => {
    try {
        const { recordId, table } = req.query;
        const id = parseInt(recordId, 10);

        if (table === 'users' || table === 'products') {
            const sql = `SELECT * FROM ${table} WHERE id = ${id}`;
            const result = await pool.query(sql);
            return res.json(result.rows);
        }

        return res.status(400).json({ error: 'Invalid table name' });
    } catch (error) {
        console.error('Database query failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
