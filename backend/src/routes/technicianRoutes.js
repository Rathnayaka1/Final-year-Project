const express = require('express');
const {
  listTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician
} = require('../controllers/technicianController');
const { authenticate, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Allow admin, supervisor, and receptionist to view technicians
router.get('/', authenticate, requireRole('admin', 'supervisor', 'receptionist'), listTechnicians);
// Only admin and supervisor can create, update, or delete technicians
router.post('/', authenticate, requireRole('admin', 'supervisor'), createTechnician);
router.patch('/:id', authenticate, requireRole('admin', 'supervisor'), updateTechnician);
router.delete('/:id', authenticate, requireRole('admin', 'supervisor'), deleteTechnician);

module.exports = router;
