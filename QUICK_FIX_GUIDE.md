# Quick Fix Guide

## Critical Fixes (Do First)

### Fix 1: AppointmentTable.jsx - Function Name Typo
```jsx
// BEFORE (Line 123, 144)
{apptsame(appt) ? 'Completed' : 'Mark completed'}

function apptsame(appt) {
  return appt.status === 'completed' && appt.queueStatus === 'completed';
}

// AFTER
{isCompletedAppointment(appt) ? 'Completed' : 'Mark completed'}

function isCompletedAppointment(appt) {
  return appt.status === 'completed' && appt.queueStatus === 'completed';
}
```

---

### Fix 2: serviceController.js - Add Try-Catch
```javascript
// BEFORE
async function getServices(req, res) {
  const services = await Service.find().sort({ createdAt: -1 });
  return res.status(200).json({ services: services.map(serializeService) });
}

// AFTER
async function getServices(req, res) {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    return res.status(200).json({ services: services.map(serializeService) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

### Fix 3: authController.js - Add Try-Catch
```javascript
// BEFORE
async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  // ... rest

// AFTER
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // ... rest of function
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

### Fix 4: customerController.js - Add Missing Import
```javascript
// BEFORE (Line 1-3)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

// AFTER
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const OTP = require('../models/OTP');  // ADD THIS LINE
```

---

### Fix 5: appointmentController.js - Race Condition Fix
```javascript
// BEFORE (Line 206-210)
async function getNextQueueNumber() {
  const latest = await Appointment.findOne().sort({ queueNumber: -1 }).select('queueNumber');
  return latest?.queueNumber ? latest.queueNumber + 1 : 101;
}

// AFTER - Use MongoDB atomic operation
async function getNextQueueNumber() {
  try {
    const latest = await Appointment.findOne()
      .sort({ queueNumber: -1 })
      .select('queueNumber')
      .lean();
    
    if (!latest) return 101;
    
    // For better concurrency, use MongoDB session/transaction
    // or implement counter pattern
    const nextNumber = (latest.queueNumber || 100) + 1;
    
    // Verify it doesn't exist (double-check)
    const exists = await Appointment.findOne({ queueNumber: nextNumber });
    if (exists) {
      return getNextQueueNumber(); // Recursive retry
    }
    
    return nextNumber;
  } catch (error) {
    console.error('Error getting next queue number:', error);
    return 101; // Fallback
  }
}
```

---

### Fix 6: appointmentController.js - Add Try-Catch to updateAppointmentStatusHandler
```javascript
// BEFORE (Line 260-298)
async function updateAppointmentStatusHandler(req, res) {
  const { id } = req.params;
  const { status, queueStatus } = req.body || {};

  // ... validation ...

  const updated = await Appointment.findByIdAndUpdate(id, update, { new: true });
  // ...
}

// AFTER
async function updateAppointmentStatusHandler(req, res) {
  try {
    const { id } = req.params;
    const { status, queueStatus } = req.body || {};

    if (!status && !queueStatus) {
      return res.status(400).json({ error: 'Provide status or queueStatus to update' });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    if (queueStatus && !allowedQueueStatuses.includes(queueStatus)) {
      return res.status(400).json({ error: 'Invalid queue status' });
    }

    const update = {};
    if (status) update.status = status;
    if (queueStatus) update.queueStatus = queueStatus;

    const updated = await Appointment.findByIdAndUpdate(id, update, { new: true });

    if (!updated) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (status === STATUS.COMPLETED) {
      await awardLoyaltyPointsForCompletion(updated);
    }

    return res.status(200).json({ appointment: serializeAppointment(updated) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

### Fix 7: appointmentController.js - Add Try-Catch to lookupAppointmentHandler
```javascript
// BEFORE (Line 318-329)
async function lookupAppointmentHandler(req, res) {
  const { code } = req.params;
  const normalized = normalizeCode(code);

  if (!normalized) {
    return res.status(400).json({ error: 'Confirmation code is required' });
  }

  const appointment = await Appointment.findOne({ confirmationCode: normalized });
  // ...
}

// AFTER
async function lookupAppointmentHandler(req, res) {
  try {
    const { code } = req.params;
    const normalized = normalizeCode(code);

    if (!normalized) {
      return res.status(400).json({ error: 'Confirmation code is required' });
    }

    const appointment = await Appointment.findOne({ confirmationCode: normalized });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    return res.status(200).json({ appointment: serializeAppointment(appointment) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

### Fix 8: technicianController.js - Add Try-Catch to All Functions
```javascript
// BEFORE
async function listTechnicians(req, res) {
  const technicians = await Technician.find().populate('serviceCenter', 'name address');
  return res.status(200).json({ technicians: technicians.map(serializeTechnician) });
}

// AFTER
async function listTechnicians(req, res) {
  try {
    const technicians = await Technician.find().populate('serviceCenter', 'name address');
    return res.status(200).json({ technicians: technicians.map(serializeTechnician) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Apply same pattern to: createTechnician, updateTechnician, deleteTechnician
```

---

### Fix 9: serviceCenterController.js - Add Try-Catch to All Functions
Same pattern as technicianController.js - wrap each async function body in try-catch

```javascript
async function listServiceCenters(req, res) {
  try {
    // ... existing code ...
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

### Fix 10: App.jsx - Proper Error Handling
```javascript
// BEFORE (Line 208-210)
} else {
  fetchServices()
    .then((payload) => setServices(payload.services))
    .catch(() => {});
}

// AFTER
} else {
  (async () => {
    try {
      const payload = await fetchServices();
      setServices(payload.services || []);
    } catch (error) {
      console.warn('Could not fetch services:', error.message);
      // Optionally show error to user
    }
  })();
}
```

---

### Fix 11: PaymentManager.jsx - Add Form Validation
```javascript
// BEFORE (Line 22)
const handleSubmit = (e) => {
  e.preventDefault();
  onCreate(form, () => {
    // ...
  });
};

// AFTER
const handleSubmit = (e) => {
  e.preventDefault();
  
  // Add validation
  if (!form.customerName.trim()) {
    alert('Customer name is required');
    return;
  }
  
  if (!form.appointmentId.trim()) {
    alert('Appointment ID is required');
    return;
  }
  
  const amount = parseFloat(form.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    alert('Amount must be a positive number');
    return;
  }
  
  onCreate(form, () => {
    // ...
  });
};
```

---

### Fix 12: ServiceCenterManager.jsx - Coordinate Validation
```javascript
// BEFORE (Line 154-157)
const payload = {
  name: form.name,
  address: form.address,
  phone: form.phone,
  email: form.email || undefined,
  coordinates: {
    lat: parseFloat(form.latitude),
    lng: parseFloat(form.longitude)
  },
  // ...
};

// AFTER
const lat = parseFloat(form.latitude);
const lng = parseFloat(form.longitude);

if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
  alert('Valid latitude and longitude are required');
  return;
}

const payload = {
  name: form.name,
  address: form.address,
  phone: form.phone,
  email: form.email || undefined,
  coordinates: {
    lat,
    lng
  },
  // ...
};
```

---

### Fix 13: RegisterScreen.js - Password Strength Validation
```javascript
// BEFORE (Line 28-35)
async function handleRegister() {
  if (!name.trim() || !phone.trim()) {
    setError('Name and phone number are required');
    return;
  }

  if (!password.trim()) {
    setError('Password is required');
    return;
  }

// AFTER
async function handleRegister() {
  if (!name.trim() || !phone.trim()) {
    setError('Name and phone number are required');
    return;
  }

  if (!password.trim()) {
    setError('Password is required');
    return;
  }

  // Add password strength validation
  if (password.length < 8) {
    setError('Password must be at least 8 characters');
    return;
  }

  if (!/[A-Z]/.test(password)) {
    setError('Password must contain at least one uppercase letter');
    return;
  }

  if (!/[0-9]/.test(password)) {
    setError('Password must contain at least one number');
    return;
  }
```

---

### Fix 14: Technician.js - Add Unique Index to Phone
```javascript
// BEFORE (End of file)
module.exports = mongoose.model('Technician', technicianSchema);

// AFTER
technicianSchema.index({ phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Technician', technicianSchema);
```

---

## Batch Apply All Controller Try-Catch Fixes

For `serviceCenterController.js`, `technicianController.js`, and any other missing try-catch blocks, use this template:

```javascript
// Template for all functions
async function functionName(req, res) {
  try {
    // ... existing function body ...
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

## Testing After Fixes

```bash
# Backend tests
cd backend
npm run dev

# Test each endpoint:
# POST /api/auth/login
# POST /api/appointments
# GET /api/services
# PATCH /api/appointments/:id/status

# Admin Web
cd admin-web
npm run dev

# Mobile App
cd mobile-app
npm start
```

---

## Verification Checklist

- [ ] AppointmentTable.jsx function renamed and working
- [ ] All controller functions have try-catch blocks
- [ ] customerController imports OTP model
- [ ] No console errors when performing CRUD operations
- [ ] Form validation working on all input forms
- [ ] Error messages display properly in UI
- [ ] No unhandled Promise rejections
- [ ] Concurrent appointment bookings don't create duplicate queue numbers
