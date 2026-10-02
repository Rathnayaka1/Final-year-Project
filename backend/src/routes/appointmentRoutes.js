const express = require('express');
const {
  createAppointment,
  listAppointments,
  getCustomerAppointments,
  getActiveAppointment,
  updateAppointmentStatus,
  lookupAppointment
} = require('../controllers/appointmentController');
const { authenticate, optionalAuth, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', optionalAuth, createAppointment);
// Allow admin, manager, supervisor, cashier, and receptionist to view appointments
router.get('/', authenticate, requireRole('admin', 'manager', 'supervisor', 'cashier', 'receptionist'), listAppointments);
router.get('/my-appointments', authenticate, getCustomerAppointments);
router.get('/active', authenticate, getActiveAppointment);
router.get('/lookup/:code', lookupAppointment);
// Allow admin, supervisor, and receptionist to update appointment status
router.patch('/:id/status', authenticate, requireRole('admin', 'supervisor', 'receptionist'), updateAppointmentStatus);

module.exports = router;
