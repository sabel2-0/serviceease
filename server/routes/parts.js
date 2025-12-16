const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all parts
router.get('/', async (req, res) => {
    try {
        // Straightforward select — return diagnostic wrapper { count, rows }
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
                unit,
                page_yield,
                ink_volume,
                color
            FROM printer_items
            ORDER BY created_at DESC
        `);

        console.log(`[GET /api/parts] fetched ${rows.length} rows`);
        return res.json({ count: rows.length, rows });
    } catch (error) {
        console.error('[GET /api/parts] initial query error:', error && error.message ? error.message : error);

        // If the table doesn't exist, try to create it and retry once
        const isNoSuchTable = error && (error.code === 'ER_NO_SUCH_TABLE' || error.errno === 1146 || (error.message && error.message.includes("doesn't exist")));
        if (isNoSuchTable) {
            try {
                console.log('[GET /api/parts] printer_items table missing — attempting to create from schema');
                const fs = require('fs');
                const path = require('path');
                const schema = fs.readFileSync(path.join(__dirname, '../config/printer_items_schema.sql'), 'utf8');
                await db.executeMultiStatementSql(schema);

                // Retry select
                const [rows2] = await db.query(`
                    SELECT id, name, brand, category, quantity, minimum_stock, status, created_at, updated_at, is_universal, unit, page_yield, ink_volume, color
                    FROM printer_items
                    ORDER BY created_at DESC
                `);
                console.log(`[GET /api/parts] fetched ${rows2.length} rows after creating table`);
                return res.json({ count: rows2.length, rows: rows2 });
            } catch (createErr) {
                console.error('[GET /api/parts] failed to create printer_items table:', createErr);
                return res.status(500).json({ count: 0, rows: [], error: 'Failed to initialize parts table', message: createErr.message });
            }
        }

        // For other errors, return 500 with a diagnostic shape
        return res.status(500).json({ count: 0, rows: [], error: 'Failed to fetch parts', message: error && error.message ? error.message : String(error) });
    }
});

// Create new part
router.post('/', async (req, res) => {
    try {
        const {
            name,
            brand,
            category,
            item_type,
            quantity,
            is_universal,
            page_yield,
            ink_volume,
            ink_cartridge_volume,
            toner_weight,
            color
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!category) {
            return res.status(400).json({ error: 'Category is required' });
        }

        const [result] = await db.query(
            `INSERT INTO printer_items (
                name,
                brand,
                category,
                item_type,
                quantity,
                is_universal,
                page_yield,
                ink_volume,
                ink_cartridge_volume,
                toner_weight,
                color
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                brand || null,
                category,
                item_type || 'printer_part',
                parseInt(quantity) || 0,
                is_universal ? 1 : 0,
                page_yield ? parseInt(page_yield) : null,
                ink_volume ? parseFloat(ink_volume) : null,
                ink_cartridge_volume ? parseFloat(ink_cartridge_volume) : null,
                toner_weight ? parseFloat(toner_weight) : null,
                color || null
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
            item_type,
            quantity,
            unit,
            minimum_stock,
            status,
            is_universal,
            page_yield,
            ink_volume,
            ink_cartridge_volume,
            toner_weight,
            color
        } = req.body;

        if (!name && !brand && !category && !item_type && quantity === undefined && unit === undefined && minimum_stock === undefined && status === undefined && is_universal === undefined && page_yield === undefined && ink_volume === undefined && ink_cartridge_volume === undefined && toner_weight === undefined && color === undefined) {
            return res.status(400).json({ error: 'At least one field to update is required' });
        }

        const updateFields = [];
        const values = [];

        if (name !== undefined) { updateFields.push('name = ?'); values.push(name); }
        if (brand !== undefined) { updateFields.push('brand = ?'); values.push(brand); }
        if (category !== undefined) { updateFields.push('category = ?'); values.push(category); }
        if (item_type !== undefined) { updateFields.push('item_type = ?'); values.push(item_type); }
        if (quantity !== undefined) { updateFields.push('quantity = ?'); values.push(quantity); }
        if (unit !== undefined) { updateFields.push('unit = ?'); values.push(unit); }
        if (minimum_stock !== undefined) { updateFields.push('minimum_stock = ?'); values.push(minimum_stock); }
        if (status !== undefined) { updateFields.push('status = ?'); values.push(status); }
        if (is_universal !== undefined) { updateFields.push('is_universal = ?'); values.push(is_universal); }
        if (page_yield !== undefined) { updateFields.push('page_yield = ?'); values.push(page_yield ? parseInt(page_yield) : null); }
        if (ink_volume !== undefined) { updateFields.push('ink_volume = ?'); values.push(ink_volume ? parseFloat(ink_volume) : null); }
        if (ink_cartridge_volume !== undefined) { updateFields.push('ink_cartridge_volume = ?'); values.push(ink_cartridge_volume ? parseFloat(ink_cartridge_volume) : null); }
        if (toner_weight !== undefined) { updateFields.push('toner_weight = ?'); values.push(toner_weight ? parseFloat(toner_weight) : null); }
        if (color !== undefined) { updateFields.push('color = ?'); values.push(color); }

        values.push(id);

        await db.query(
            `UPDATE printer_items 
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
            'DELETE FROM printer_items WHERE id = ?',
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

// Debug endpoint: return count and a sample of parts (safe, read-only)
router.get('/debug', async (req, res) => {
    try {
        const [countRows] = await db.query('SELECT COUNT(*) as cnt FROM printer_items');
        const count = countRows && countRows[0] ? Number(countRows[0].cnt) : 0;
        const [sampleRows] = await db.query(
            `SELECT id, name, brand, category, quantity, minimum_stock, status, created_at
             FROM printer_items
             ORDER BY created_at DESC
             LIMIT 20`
        );
        res.json({ count, sample: sampleRows });
    } catch (error) {
        console.error('Error in GET /api/parts/debug:', error);
        res.status(500).json({ error: 'Failed to fetch parts debug info', message: error.message });
    }
});

module.exports = router;



