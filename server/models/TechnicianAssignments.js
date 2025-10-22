const db = require('../config/database');

class TechnicianAssignments {
	// Get institutions assigned to a technician by technician_id
	static async getInstitutionsByTechnician(technicianId) {
		try {
			const [rows] = await db.query(`
				SELECT i.institution_id, i.name, i.type, i.address
				FROM technician_assignments ta
				JOIN institutions i ON ta.institution_id = i.institution_id
				WHERE ta.technician_id = ? AND ta.is_active = TRUE
			`, [technicianId]);
			return rows;
		} catch (error) {
			console.error('Error fetching assigned institutions:', error);
			throw new Error('Database error while fetching assigned institutions');
		}
	}
}

module.exports = TechnicianAssignments;