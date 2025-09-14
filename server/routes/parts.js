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
                part_number,
                category,
                description,
                quantity as stock,
                minimum_stock,
                status,
                compatible_printers,
                created_at,
                updated_at
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
            partNumber, 
            category, 
            description, 
            stock, 
            minimumStock, 
            compatiblePrinters 
        } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const quantity = parseInt(stock) || 0;
        const status = quantity > 10 ? 'in_stock' : quantity > 0 ? 'low_stock' : 'out_of_stock';

        const [result] = await db.query(
            `INSERT INTO printer_parts (
                name, 
                part_number, 
                category, 
                description, 
                quantity, 
                minimum_stock, 
                status, 
                compatible_printers
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, 
                partNumber || null, 
                category || null, 
                description || null, 
                quantity, 
                minimumStock || 5, 
                status,
                compatiblePrinters || null
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
        const { name, category, stock } = req.body;

        if (!name && !category && stock === undefined) {
            return res.status(400).json({ error: 'At least one field to update is required' });
        }

        const updateFields = [];
        const values = [];

        if (name) {
            updateFields.push('name = ?');
            values.push(name);
        }
        if (category) {
            updateFields.push('category = ?');
            values.push(category);
        }
        if (stock !== undefined) {
            updateFields.push('stock = ?');
            values.push(stock);
        }

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
