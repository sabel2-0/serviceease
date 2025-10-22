const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Run Association Rule Mining Analysis
 * Executes Python script to analyze parts usage patterns
 */
router.post('/analyze', async (req, res) => {
    try {
        const { printer_brand, printer_model, min_support, min_confidence } = req.body;

        console.log('🔍 Running ARM analysis:', { printer_brand, printer_model, min_support, min_confidence });

        // Default parameters
        const support = min_support || 0.1;
        const confidence = min_confidence || 0.5;

        // Path to Python script
        const scriptPath = path.join(__dirname, '..', 'scripts', 'association_rule_mining.py');

        // Build arguments
        const args = ['analyze_printer', printer_brand, printer_model, support.toString(), confidence.toString()];

        // Execute Python script
        const pythonProcess = spawn('python', [scriptPath, ...args]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('❌ Python script error:', errorString);
                return res.status(500).json({
                    success: false,
                    message: 'Analysis failed',
                    error: errorString
                });
            }

            try {
                const result = JSON.parse(dataString);
                return res.json(result);
            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to parse analysis results',
                    error: parseError.message
                });
            }
        });

    } catch (error) {
        console.error('❌ ARM analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Analysis failed',
            error: error.message
        });
    }
});

/**
 * Analyze all printers and cache results
 */
router.post('/analyze-all', async (req, res) => {
    try {
        const { min_support, min_confidence } = req.body;

        console.log('🔍 Running ARM analysis for all printers...');

        const support = min_support || 0.1;
        const confidence = min_confidence || 0.5;

        const scriptPath = path.join(__dirname, '..', 'scripts', 'association_rule_mining.py');
        const args = ['analyze_all', support.toString(), confidence.toString()];

        const pythonProcess = spawn('python', [scriptPath, ...args]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('❌ Python script error:', errorString);
                return res.status(500).json({
                    success: false,
                    message: 'Analysis failed',
                    error: errorString
                });
            }

            try {
                const result = JSON.parse(dataString);
                return res.json(result);
            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to parse analysis results',
                    error: parseError.message
                });
            }
        });

    } catch (error) {
        console.error('❌ ARM analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Analysis failed',
            error: error.message
        });
    }
});

/**
 * Get cached ARM results from database
 */
router.get('/cached/:brand/:model', async (req, res) => {
    try {
        const { brand, model } = req.params;

        const [results] = await db.query(
            'SELECT analysis_data, created_at FROM arm_analysis_cache WHERE printer_brand = ? AND printer_model = ?',
            [brand, model]
        );

        if (results.length === 0) {
            return res.json({
                success: false,
                message: 'No cached analysis found',
                cached: false
            });
        }

        const analysisData = JSON.parse(results[0].analysis_data);
        analysisData.cached = true;
        analysisData.cached_at = results[0].created_at;

        res.json(analysisData);

    } catch (error) {
        console.error('❌ Error fetching cached analysis:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cached analysis',
            error: error.message
        });
    }
});

/**
 * Get part recommendations based on printer
 */
router.get('/recommendations/:inventoryItemId', async (req, res) => {
    try {
        const { inventoryItemId } = req.params;

        // Get printer details
        const [printers] = await db.query(
            'SELECT brand, model FROM inventory_items WHERE id = ?',
            [inventoryItemId]
        );

        if (printers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Printer not found'
            });
        }

        const { brand, model } = printers[0];

        // Check cache first
        const [cached] = await db.query(
            'SELECT analysis_data, created_at FROM arm_analysis_cache WHERE printer_brand = ? AND printer_model = ?',
            [brand, model]
        );

        if (cached.length > 0) {
            // Check if cache is less than 24 hours old
            const cacheAge = Date.now() - new Date(cached[0].created_at).getTime();
            if (cacheAge < 24 * 60 * 60 * 1000) {
                const analysisData = JSON.parse(cached[0].analysis_data);
                return res.json({
                    ...analysisData,
                    cached: true,
                    cached_at: cached[0].created_at
                });
            }
        }

        // If no cache or expired, run fresh analysis
        const scriptPath = path.join(__dirname, '..', 'scripts', 'association_rule_mining.py');
        const args = ['analyze_printer', brand, model, '0.1', '0.5'];

        const pythonProcess = spawn('python', [scriptPath, ...args]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error('❌ Python script error:', errorString);
                return res.status(500).json({
                    success: false,
                    message: 'Analysis failed',
                    error: errorString
                });
            }

            try {
                const result = JSON.parse(dataString);
                
                // Cache the result
                if (result.success) {
                    await db.query(
                        `INSERT INTO arm_analysis_cache (printer_brand, printer_model, analysis_data)
                         VALUES (?, ?, ?)
                         ON DUPLICATE KEY UPDATE 
                            analysis_data = VALUES(analysis_data),
                            created_at = CURRENT_TIMESTAMP`,
                        [brand, model, JSON.stringify(result)]
                    );
                }

                return res.json({ ...result, cached: false });
            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to parse analysis results',
                    error: parseError.message
                });
            }
        });

    } catch (error) {
        console.error('❌ Error getting recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recommendations',
            error: error.message
        });
    }
});

/**
 * Get statistics for ARM insights
 */
router.get('/statistics', async (req, res) => {
    try {
        // Get overall statistics
        const [stats] = await db.query(`
            SELECT 
                COUNT(DISTINCT sr.id) as total_completed_requests,
                COUNT(DISTINCT spu.id) as total_parts_used,
                COUNT(DISTINCT spu.part_id) as unique_parts_used,
                COUNT(DISTINCT sr.inventory_item_id) as unique_printers
            FROM service_requests sr
            LEFT JOIN service_parts_used spu ON sr.id = spu.service_request_id
            WHERE sr.status = 'completed'
        `);

        // Get top part combinations
        const [topCombinations] = await db.query(`
            SELECT 
                ii.brand,
                ii.model,
                GROUP_CONCAT(DISTINCT pp.name ORDER BY pp.name SEPARATOR ', ') as parts,
                COUNT(*) as frequency
            FROM service_requests sr
            INNER JOIN inventory_items ii ON sr.inventory_item_id = ii.id
            INNER JOIN service_parts_used spu ON sr.id = spu.service_request_id
            INNER JOIN printer_parts pp ON spu.part_id = pp.id
            WHERE sr.status = 'completed'
            GROUP BY sr.id, ii.brand, ii.model
            HAVING COUNT(DISTINCT spu.part_id) >= 2
            ORDER BY frequency DESC
            LIMIT 10
        `);

        // Get cached analyses count
        const [cacheCount] = await db.query(
            'SELECT COUNT(*) as count FROM arm_analysis_cache'
        );

        res.json({
            success: true,
            statistics: stats[0],
            top_combinations: topCombinations,
            cached_analyses: cacheCount[0].count
        });

    } catch (error) {
        console.error('❌ Error getting statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics',
            error: error.message
        });
    }
});

module.exports = router;
