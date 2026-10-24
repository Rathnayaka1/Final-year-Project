const express = require('express');
const {
  listTechnicians,
  getAvailableTechnicians,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  predictTechniciansEndpoint,
  rateTechnician
} = require('../controllers/technicianController');
const { authenticate, optionalAuth, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// Allow public/app fetching of available technicians for appointment booking
router.get('/available', getAvailableTechnicians);
router.post('/predict', predictTechniciansEndpoint);
router.post('/:id/rate', optionalAuth, rateTechnician);

// Allow admin, supervisor, and receptionist to view technicians
router.get('/', authenticate, requireRole('admin', 'supervisor', 'receptionist'), listTechnicians);
// Only admin and supervisor can create, update, or delete technicians
router.post('/', authenticate, requireRole('admin', 'supervisor'), createTechnician);
router.patch('/:id', authenticate, requireRole('admin', 'supervisor'), updateTechnician);
router.delete('/:id', authenticate, requireRole('admin', 'supervisor'), deleteTechnician);

module.exports = router;
