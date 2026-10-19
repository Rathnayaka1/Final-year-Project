const express = require('express');
const { login, registerCenter, getPublicServiceCenters } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/register-center', registerCenter);
router.get('/centers', getPublicServiceCenters);

module.exports = router;
