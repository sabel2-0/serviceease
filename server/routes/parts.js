const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all parts
router.get('/', async (req, res) => {
    try {
        console.log('Attempting to fetch parts...');

        // First test database connection
        try {
            await db.query('SELECT 1');
            console.log('Database connection test successful');
        } catch (connError) {
            console.error('Database connection test failed:', connError);
            throw new Error('Database connection failed: ' + connError.message);
        }

        // Check if the database exists
        try {
            const [databases] = await db.query(`
                SELECT SCHEMA_NAME 
                FROM information_schema.SCHEMATA 
                WHERE SCHEMA_NAME = 'serviceease'
            `);
            if (databases.length === 0) {
                console.error('Database "serviceease" does not exist');
                throw new Error('Database "serviceease" does not exist');
            }
            console.log('Database "serviceease" exists');
        } catch (dbError) {
            console.error('Error checking database:', dbError);
            throw new Error('Failed to verify database: ' + dbError.message);
        }

        // Check if the table exists
        try {
            const [tables] = await db.query(`
                SELECT TABLE_NAME 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = 'serviceease' 
                AND TABLE_NAME = 'printer_parts'
            `);
            
            if (tables.length === 0) {
                console.log('printer_parts table does not exist, creating it...');
                // Create the table if it doesn't exist
                const schema = require('fs').readFileSync(require('path').join(__dirname, '../config/printer_parts_schema.sql'), 'utf8');
                await db.executeMultiStatementSql(schema);
                console.log('Created printer_parts table successfully');
            } else {
                console.log('printer_parts table exists');
            }
        } catch (tableError) {
            console.error('Error with printer_parts table:', tableError);
            throw new Error('Table operation failed: ' + tableError.message);
        }

        // Now try to fetch the parts
        const [rows] = await db.query(`
            SELECT 
                id,
                name,
                brand,
                category,
                quantity,
                minimum_stock,
                status,
                created_at,
                updated_at,
                is_universal,
                unit
            FROM printer_parts
            ORDER BY created_at DESC
        `);
        console.log(`Successfully fetched ${rows.length} parts`);
        res.json(rows);
    } catch (error) {
        console.error('Error in GET /api/parts:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to fetch parts',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Create new part
router.post('/', async (req, res) => {
    try {
        const {
            name,
            brand,
            category,
            quantity,
            is_universal
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!category) {
            return res.status(400).json({ error: 'Category is required' });
        }

        const [result] = await db.query(
            `INSERT INTO printer_parts (
                name,
                brand,
                category,
                quantity,
                is_universal
            ) VALUES (?, ?, ?, ?, ?)`,
            [
                name,
                brand || null,
                category,
                parseInt(quantity) || 0,
                is_universal ? 1 : 0
            ]
        );

        res.status(201).json({
            message: 'Part created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating part:', error);
        res.status(500).json({ error: 'Failed to create part' });
    }
});

// Update part
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            brand,
            category,
            quantity,
            unit,
            minimum_stock,
            status,
            is_universal
        } = req.body;

        if (!name && !brand && !category && quantity === undefined && unit === undefined && minimum_stock === undefined && status === undefined && is_universal === undefined) {
            return res.status(400).json({ error: 'At least one field to update is required' });
        }

        const updateFields = [];
        const values = [];

        if (name !== undefined) { updateFields.push('name = ?'); values.push(name); }
        if (brand !== undefined) { updateFields.push('brand = ?'); values.push(brand); }
        if (category !== undefined) { updateFields.push('category = ?'); values.push(category); }
        if (quantity !== undefined) { updateFields.push('quantity = ?'); values.push(quantity); }
        if (unit !== undefined) { updateFields.push('unit = ?'); values.push(unit); }
        if (minimum_stock !== undefined) { updateFields.push('minimum_stock = ?'); values.push(minimum_stock); }
        if (status !== undefined) { updateFields.push('status = ?'); values.push(status); }
        if (is_universal !== undefined) { updateFields.push('is_universal = ?'); values.push(is_universal); }

        values.push(id);

        await db.query(
            `UPDATE printer_parts 
             SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            values
        );

        res.json({ message: 'Part updated successfully' });
    } catch (error) {
        console.error('Error updating part:', error);
        res.status(500).json({ error: 'Failed to update part' });
    }
});

// Delete part
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM printer_parts WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Part not found' });
        }

        res.json({ message: 'Part deleted successfully' });
    } catch (error) {
        console.error('Error deleting part:', error);
        res.status(500).json({ error: 'Failed to delete part' });
    }
});

module.exports = router;
