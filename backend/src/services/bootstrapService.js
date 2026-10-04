const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Service = require('../models/Service');
const ServiceCenter = require('../models/ServiceCenter');
const Technician = require('../models/Technician');

const defaultServices = [
  {
    name: 'Device Diagnostics',
    description: 'Full hardware and software diagnostics for any smart device.',
    duration: 30,
    basePrice: 25
  },
  {
    name: 'Express Repair Consultation',
    description: 'Meet a technician to triage repair options and timelines.',
    duration: 20,
    basePrice: 15
  },
  {
    name: 'Warranty Claim Support',
    description: 'Guided assistance preparing documentation for warranty claims.',
    duration: 40,
    basePrice: 0
  }
];

const defaultAdmins = [
  {
    name: 'Service Center Admin',
    email: 'admin@servicecenter.dev',
    role: 'admin',
    password: 'Admin123!'
  },
  {
    name: 'Inventory Manager',
    email: 'manager@servicecenter.dev',
    role: 'manager',
    password: 'Manager123!'
  },
  {
    name: 'Technician Supervisor',
    email: 'supervisor@servicecenter.dev',
    role: 'supervisor',
    password: 'Supervisor123!'
  },
  {
    name: 'Cashier',
    email: 'cashier@servicecenter.dev',
    role: 'cashier',
    password: 'Cashier123!'
  },
  {
    name: 'Front Desk Receptionist',
    email: 'receptionist@servicecenter.dev',
    role: 'receptionist',
    password: 'Receptionist123!'
  }
];

async function ensureAdminUsers() {
  for (const admin of defaultAdmins) {
    const exists = await User.findOne({ email: admin.email });
    if (!exists) {
      await User.create({
        name: admin.name,
        email: admin.email,
        role: admin.role,
        passwordHash: bcrypt.hashSync(admin.password, 10)
      });
      console.log(`Seeded admin user ${admin.email}`);
    }
  }
}

async function ensureServices() {
  const count = await Service.countDocuments();
  if (count > 0) {
    return;
  }
  await Service.insertMany(defaultServices);
  console.log('Seeded default services');
}

async function ensureServiceCenters() {
  const count = await ServiceCenter.countDocuments();
  if (count > 0) {
    return;
  }

  const defaultCenters = [
    {
      name: 'Downtown Service Center',
      address: '123 Main Street, Downtown',
      location: { type: 'Point', coordinates: [80.2167, 6.9271] }, // Colombo coords
      phone: '+94112345678',
      email: 'downtown@servicecenter.dev',
      operatingHours: {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: { open: '', close: '' }
      },
      facilities: ['WiFi', 'Waiting Lounge', 'Coffee', 'Certified Technicians'],
      rating: 4.5,
      totalRatings: 120,
      currentQueueLength: 3,
      averageWaitTime: 25
    },
    {
      name: 'Westside Auto Care',
      address: '456 West Avenue, Westside',
      location: { type: 'Point', coordinates: [80.1950, 6.9497] },
      phone: '+94112345679',
      email: 'westside@servicecenter.dev',
      operatingHours: {
        monday: { open: '07:30', close: '19:00' },
        tuesday: { open: '07:30', close: '19:00' },
        wednesday: { open: '07:30', close: '19:00' },
        thursday: { open: '07:30', close: '19:00' },
        friday: { open: '07:30', close: '19:00' },
        saturday: { open: '08:00', close: '16:00' },
        sunday: { open: '', close: '' }
      },
      facilities: ['WiFi', 'Waiting Lounge', 'Valet Parking', 'Express Service'],
      rating: 4.8,
      totalRatings: 95,
      currentQueueLength: 2,
      averageWaitTime: 20
    },
    {
      name: 'Eastside Quick Fix',
      address: '789 East Road, Eastside',
      location: { type: 'Point', coordinates: [80.2450, 6.9050] },
      phone: '+94112345680',
      email: 'eastside@servicecenter.dev',
      operatingHours: {
        monday: { open: '08:00', close: '17:00' },
        tuesday: { open: '08:00', close: '17:00' },
        wednesday: { open: '08:00', close: '17:00' },
        thursday: { open: '08:00', close: '17:00' },
        friday: { open: '08:00', close: '17:00' },
        saturday: { open: '09:00', close: '13:00' },
        sunday: { open: '', close: '' }
      },
      facilities: ['WiFi', 'Waiting Lounge', 'Car Wash', 'Pick & Drop'],
      rating: 4.3,
      totalRatings: 78,
      currentQueueLength: 5,
      averageWaitTime: 35
    }
  ];

  await ServiceCenter.insertMany(defaultCenters);
  console.log('Seeded default service centers');
}

async function ensureTechnicians() {
  const count = await Technician.countDocuments();
  if (count > 0) return;

  const centers = await ServiceCenter.find({}).limit(3);
  const firstCenterId = centers[0]?._id || null;
  const secondCenterId = centers[1]?._id || firstCenterId;

  const defaultTechnicians = [
    {
      name: 'Kasun Perera',
      phone: '+94771234567',
      email: 'kasun@servicecenter.dev',
      specialization: 'Full Body & Washing Specialist',
      experienceYears: 5,
      status: 'active',
      serviceCenter: firstCenterId,
      skills: ['Full Body', 'Body Wash', 'Interior Cleaning'],
      totalJobs: 142,
      averageRating: 4.8,
      successRate: 98
    },
    {
      name: 'Nimal Fernando',
      phone: '+94772345678',
      email: 'nimal@servicecenter.dev',
      specialization: 'Engine & Mechanical Triage',
      experienceYears: 7,
      status: 'active',
      serviceCenter: firstCenterId,
      skills: ['Diagnostics', 'Engine Wash', 'Repair'],
      totalJobs: 210,
      averageRating: 4.9,
      successRate: 99
    },
    {
      name: 'Sunera Silva',
      phone: '+94773456789',
      email: 'sunera@servicecenter.dev',
      specialization: 'Interior & Detailing Expert',
      experienceYears: 3,
      status: 'active',
      serviceCenter: secondCenterId,
      skills: ['Interior Cleaning', 'Polishing', 'Vacuuming'],
      totalJobs: 85,
      averageRating: 4.6,
      successRate: 95
    },
    {
      name: 'Ruwan Kumara',
      phone: '+94774567890',
      email: 'ruwan@servicecenter.dev',
      specialization: 'Express Maintenance & Oil Change',
      experienceYears: 4,
      status: 'active',
      serviceCenter: secondCenterId,
      skills: ['Express Service', 'Oil Change', 'Filter Replacement'],
      totalJobs: 115,
      averageRating: 4.7,
      successRate: 97
    }
  ];

  await Technician.insertMany(defaultTechnicians);
  console.log('Seeded default 4 technicians');
}

async function bootstrapData() {
  await ensureAdminUsers();
  await ensureServices();
  await ensureServiceCenters();
  await ensureTechnicians();
}

module.exports = {
  bootstrapData
};
