const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Service = require('../models/Service');
const ServiceCenter = require('../models/ServiceCenter');
const Technician = require('../models/Technician');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');

const defaultServices = [
  {
    name: 'Body Wash & Vacuum',
    description: 'High-pressure exterior foam wash, tire dressing, and interior vacuum.',
    duration: 30,
    basePrice: 2500,
    vehicleType: 'All',
    category: 'Detailing & Wash',
    serviceType: 'Body Wash'
  },
  {
    name: 'Full Body Foam Wash',
    description: 'Full exterior foam wash, undercarriage rinse, engine bay cleaning, and spray wax.',
    duration: 45,
    basePrice: 4500,
    vehicleType: 'All',
    category: 'Detailing & Wash',
    serviceType: 'Full Body'
  },
  {
    name: 'Interior Deep Clean & Detailing',
    description: 'Interior steam clean, upholstery shampoo, leather conditioning, and odor removal.',
    duration: 60,
    basePrice: 6000,
    vehicleType: 'All',
    category: 'Detailing & Wash',
    serviceType: 'Interior'
  }
];

async function ensureServiceCenters() {
  const defaultCenters = [
    {
      name: 'Downtown Service Center',
      address: '123 Main Street, Colombo 01',
      location: { type: 'Point', coordinates: [79.8450, 6.9350] },
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
      address: '456 West Avenue, Colombo 07',
      location: { type: 'Point', coordinates: [79.8650, 6.9100] },
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
    }
  ];

  for (const center of defaultCenters) {
    const existing = await ServiceCenter.findOne({ name: center.name });
    if (!existing) {
      await ServiceCenter.create(center);
      console.log(`Seeded service center: ${center.name}`);
    }
  }
}

async function ensureAdminUsers() {
  const downtown = await ServiceCenter.findOne({ name: 'Downtown Service Center' });
  const westside = await ServiceCenter.findOne({ name: 'Westside Auto Care' });

  const staffUsers = [
    // ─── Downtown Service Center Staff ──────────────────────────────
    {
      name: 'Downtown Admin',
      email: 'admin@servicecenter.dev',
      role: 'admin',
      password: 'Admin123!',
      serviceCenter: downtown?._id || null
    },
    {
      name: 'Downtown Inventory Manager',
      email: 'manager@servicecenter.dev',
      role: 'manager',
      password: 'Manager123!',
      serviceCenter: downtown?._id || null
    },
    {
      name: 'Downtown Supervisor',
      email: 'supervisor@servicecenter.dev',
      role: 'supervisor',
      password: 'Supervisor123!',
      serviceCenter: downtown?._id || null
    },
    {
      name: 'Downtown Cashier',
      email: 'cashier@servicecenter.dev',
      role: 'cashier',
      password: 'Cashier123!',
      serviceCenter: downtown?._id || null
    },
    {
      name: 'Downtown Receptionist',
      email: 'receptionist@servicecenter.dev',
      role: 'receptionist',
      password: 'Receptionist123!',
      serviceCenter: downtown?._id || null
    },

    // ─── Westside Auto Care Staff ────────────────────────────────────
    {
      name: 'Westside Admin',
      email: 'admin.westside@servicecenter.dev',
      role: 'admin',
      password: 'Admin123!',
      serviceCenter: westside?._id || null
    },
    {
      name: 'Westside Inventory Manager',
      email: 'manager.westside@servicecenter.dev',
      role: 'manager',
      password: 'Manager123!',
      serviceCenter: westside?._id || null
    },
    {
      name: 'Westside Supervisor',
      email: 'supervisor.westside@servicecenter.dev',
      role: 'supervisor',
      password: 'Supervisor123!',
      serviceCenter: westside?._id || null
    },
    {
      name: 'Westside Cashier',
      email: 'cashier.westside@servicecenter.dev',
      role: 'cashier',
      password: 'Cashier123!',
      serviceCenter: westside?._id || null
    },
    {
      name: 'Westside Receptionist',
      email: 'receptionist.westside@servicecenter.dev',
      role: 'receptionist',
      password: 'Receptionist123!',
      serviceCenter: westside?._id || null
    }
  ];

  for (const staff of staffUsers) {
    const existing = await User.findOne({ email: staff.email.toLowerCase() });
    if (!existing) {
      await User.create({
        name: staff.name,
        email: staff.email.toLowerCase(),
        role: staff.role,
        passwordHash: bcrypt.hashSync(staff.password, 10),
        serviceCenter: staff.serviceCenter
      });
      console.log(`Seeded staff user ${staff.email} for center ${staff.serviceCenter}`);
    } else if (!existing.serviceCenter && staff.serviceCenter) {
      existing.serviceCenter = staff.serviceCenter;
      await existing.save();
      console.log(`Linked staff user ${staff.email} to service center`);
    }
  }
}

async function ensureServices() {
  const downtown = await ServiceCenter.findOne({ name: 'Downtown Service Center' });
  const westside = await ServiceCenter.findOne({ name: 'Westside Auto Care' });

  // Update any existing services with vehicleType 'Mini Bus' to 'Van'
  await Service.updateMany({ vehicleType: 'Mini Bus' }, { $set: { vehicleType: 'Van' } });

  // Remove legacy smart device dummy services if present
  const legacyNames = ['Device Diagnostics', 'Express Repair Consultation', 'Warranty Claim Support'];
  await Service.deleteMany({ name: { $in: legacyNames } });

  // 1. Ensure Downtown has the core 3 Auto Services
  if (downtown) {
    const downtownCount = await Service.countDocuments({ serviceCenter: downtown._id });
    if (downtownCount === 0) {
      await Service.insertMany(
        defaultServices.map((s) => ({ ...s, serviceCenter: downtown._id }))
      );
      console.log('Seeded core auto services for Downtown Service Center');
    }
  }

  // 2. Ensure all services in DB have a valid and accurate serviceType
  const allServices = await Service.find({});
  for (const svc of allServices) {
    const lower = (svc.name || '').toLowerCase();
    let expectedType = 'Body Wash';
    if (lower.includes('interior') || lower.includes('sanitization') || lower.includes('steam')) expectedType = 'Interior';
    else if (lower.includes('full') || lower.includes('hybrid')) expectedType = 'Full Body';
    else expectedType = 'Body Wash';

    if (svc.serviceType !== expectedType) {
      svc.serviceType = expectedType;
      await svc.save();
    }
  }

  // 3. Ensure Westside has the matching standard services if empty
  if (westside) {
    const westsideServicesCount = await Service.countDocuments({ serviceCenter: westside._id });
    if (westsideServicesCount === 0) {
      await Service.insertMany([
        { name: 'Body Wash', description: 'Quick exterior body wash, window cleaning, and mat cleaning for cars.', duration: 90, basePrice: 1500, vehicleType: 'Car', serviceType: 'Body Wash', category: 'Detailing & Wash', serviceCenter: westside._id },
        { name: 'Body Wash', description: 'Exterior body and foot mat wash for vans without underbody cleaning.', duration: 120, basePrice: 2000, vehicleType: 'Van', serviceType: 'Body Wash', category: 'Detailing & Wash', serviceCenter: westside._id },
        { name: 'Body Wash', description: 'Fast exterior body wash for daily cab maintenance.', duration: 90, basePrice: 1200, vehicleType: 'Cab', serviceType: 'Body Wash', category: 'Detailing & Wash', serviceCenter: westside._id },
        { name: 'Full Body Wash & Service', description: 'Complete exterior, underbody, engine wash, and interior vacuuming for cars.', duration: 150, basePrice: 3500, vehicleType: 'Car', serviceType: 'Full Body', category: 'Detailing & Wash', serviceCenter: westside._id },
        { name: 'Full Body Wash & Service', description: 'Full exterior, underbody wash, roof cleaning, and interior vacuuming for vans.', duration: 180, basePrice: 4500, vehicleType: 'Van', serviceType: 'Full Body', category: 'Detailing & Wash', serviceCenter: westside._id },
        { name: 'Full Body Wash & Service', description: 'Complete quick full body wash and interior vacuuming for commercial cabs.', duration: 150, basePrice: 3800, vehicleType: 'Cab', serviceType: 'Full Body', category: 'Detailing & Wash', serviceCenter: westside._id },
        { name: 'Interior Deep Detailing', description: 'Deep shampooing of seats, carpet, roof lining, and dashboard conditioning for cars.', duration: 270, basePrice: 15000, vehicleType: 'Car', serviceType: 'Interior', category: 'Detailing & Wash', serviceCenter: westside._id },
        { name: 'Interior Deep Detailing', description: 'Full cabin upholstery shampooing, stain removal, and odor elimination for vans.', duration: 330, basePrice: 20000, vehicleType: 'Van', serviceType: 'Interior', category: 'Detailing & Wash', serviceCenter: westside._id },
        { name: 'Interior Deep Detailing', description: 'Intensive seat cleaning, disinfection, and deodorizing tailored for passenger cabs.', duration: 240, basePrice: 15000, vehicleType: 'Cab', serviceType: 'Interior', category: 'Detailing & Wash', serviceCenter: westside._id }
      ]);
      console.log('Seeded 9 standard auto services for Westside Auto Care');
    }
  }
}

async function ensureTechnicians() {
  const downtown = await ServiceCenter.findOne({ name: 'Downtown Service Center' });
  const westside = await ServiceCenter.findOne({ name: 'Westside Auto Care' });

  // Update any existing technicians missing serviceCenter
  if (downtown) {
    await Technician.updateMany(
      { $or: [{ serviceCenter: null }, { serviceCenter: { $exists: false } }] },
      { $set: { serviceCenter: downtown._id } }
    );
  }

  const downtownCount = downtown ? await Technician.countDocuments({ serviceCenter: downtown._id }) : 0;
  if (downtown && downtownCount === 0) {
    const downtownTechs = [
      {
        name: 'Kasun Perera',
        phone: '+94771234567',
        email: 'kasun.p@servicecenter.dev',
        specialization: 'Full Body & Ceramic Coating Specialist',
        experienceYears: 8,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['Full Body', 'Nano Ceramic', 'Machine Buffing', 'Paint Correction'],
        totalJobs: 185,
        completedJobs: 181,
        averageRating: 4.9,
        totalRatings: 142,
        successRate: 98,
        historicalSpeedRatio: 1.10,
        notes: 'Master certified automotive detailer with 8+ years track record.'
      },
      {
        name: 'Nimal Fernando',
        phone: '+94772345678',
        email: 'nimal.f@servicecenter.dev',
        specialization: 'Undercarriage Degreasing & Engine Bay Detailer',
        experienceYears: 7,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['High-Pressure Wash', 'Engine Cleaning', 'Rust Proofing', 'Underbody'],
        totalJobs: 160,
        completedJobs: 155,
        averageRating: 4.8,
        totalRatings: 120,
        successRate: 97,
        historicalSpeedRatio: 1.08,
        notes: 'Heavy vehicle and chassis degrease specialist.'
      },
      {
        name: 'Chaminda Vaas',
        phone: '+94773456701',
        email: 'chaminda.v@servicecenter.dev',
        specialization: 'Premium Leather & Interior Sanitization Expert',
        experienceYears: 6,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['Steam Sanitization', 'Leather Care', 'Deep Interior Vacuuming', 'Odor Removal'],
        totalJobs: 140,
        completedJobs: 138,
        averageRating: 4.9,
        totalRatings: 110,
        successRate: 99,
        historicalSpeedRatio: 1.06,
        notes: 'Interior deep extraction and high-end upholstery maestro.'
      },
      {
        name: 'Dhammika Prasad',
        phone: '+94773456702',
        email: 'dhammika.p@servicecenter.dev',
        specialization: 'Exterior Gloss & Hydrophobic Wax Specialist',
        experienceYears: 5,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['Clay Bar Treatment', 'Wax Application', 'Foam Wash', 'Swirl Removal'],
        totalJobs: 125,
        completedJobs: 120,
        averageRating: 4.7,
        totalRatings: 95,
        successRate: 96,
        historicalSpeedRatio: 1.05,
        notes: 'High speed paint protection and exterior mirror shine.'
      },
      {
        name: 'Nuwan Pradeep',
        phone: '+94773456703',
        email: 'nuwan.p@servicecenter.dev',
        specialization: 'Standard Body Wash & Interior Cleaner',
        experienceYears: 3,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['Body Wash', 'Vacuuming', 'Glass Polish'],
        totalJobs: 65,
        completedJobs: 58,
        averageRating: 4.3,
        totalRatings: 45,
        successRate: 90,
        historicalSpeedRatio: 0.98,
        notes: 'Reliable general technician for standard daily vehicle maintenance.'
      },
      {
        name: 'Sahan Arachchige',
        phone: '+94773456704',
        email: 'sahan.a@servicecenter.dev',
        specialization: 'Wash & Upholstery Care Technician',
        experienceYears: 3,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['Foam Shampoo', 'Tire Dressing', 'Carpet Cleaning'],
        totalJobs: 55,
        completedJobs: 49,
        averageRating: 4.2,
        totalRatings: 38,
        successRate: 89,
        historicalSpeedRatio: 0.97,
        notes: 'Consistent turnaround on mid-range foam wash and detailing.'
      },
      {
        name: 'Isuru Udana',
        phone: '+94773456705',
        email: 'isuru.u@servicecenter.dev',
        specialization: 'Express Wash & Rapid Detailing',
        experienceYears: 2.5,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['High-Pressure Rinse', 'Dashboard Dressing', 'Tire Shine'],
        totalJobs: 48,
        completedJobs: 42,
        averageRating: 4.1,
        totalRatings: 30,
        successRate: 88,
        historicalSpeedRatio: 0.96,
        notes: 'Quick turnaround technician for express service lines.'
      },
      {
        name: 'Asela Gunaratne',
        phone: '+94773456706',
        email: 'asela.g@servicecenter.dev',
        specialization: 'Junior Exterior Wash Assistant',
        experienceYears: 1,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['Basic Pre-wash', 'Wheel Scrubbing'],
        totalJobs: 18,
        completedJobs: 14,
        averageRating: 3.5,
        totalRatings: 12,
        successRate: 78,
        historicalSpeedRatio: 0.88,
        notes: 'Junior technician undergoing basic pressure wash calibration.'
      },
      {
        name: 'Dasun Shanaka',
        phone: '+94773456707',
        email: 'dasun.s@servicecenter.dev',
        specialization: 'Trainee Interior Cleaner',
        experienceYears: 0.8,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['Mat Cleaning', 'Vacuuming Assist'],
        totalJobs: 12,
        completedJobs: 9,
        averageRating: 3.3,
        totalRatings: 8,
        successRate: 74,
        historicalSpeedRatio: 0.85,
        notes: 'Apprentice technician assigned to supervised vacuuming and mat cleaning.'
      },
      {
        name: 'Lahiru Kumara',
        phone: '+94773456708',
        email: 'lahiru.k@servicecenter.dev',
        specialization: 'Probationary Bay Assistant',
        experienceYears: 0.5,
        status: 'active',
        serviceCenter: downtown._id,
        skills: ['Water Spray', 'Towel Drying'],
        totalJobs: 8,
        completedJobs: 5,
        averageRating: 3.1,
        totalRatings: 6,
        successRate: 70,
        historicalSpeedRatio: 0.82,
        notes: 'New trainee learning standard operating procedures.'
      }
    ];
    await Technician.insertMany(downtownTechs);
    console.log('Seeded 10 technicians for Downtown Service Center');
  }

  const westsideCount = westside ? await Technician.countDocuments({ serviceCenter: westside._id }) : 0;
  if (westside && westsideCount === 0) {
    const westsideTechs = [
      {
        name: 'Sunera Silva',
        phone: '+94774567001',
        email: 'sunera.s@servicecenter.dev',
        specialization: 'Interior Deep Detailing & Steam Extraction Lead',
        experienceYears: 8,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Hot Water Extraction', 'Odor Neutralization', 'Leather Restoration', 'Steam Cleaning'],
        totalJobs: 195,
        completedJobs: 193,
        averageRating: 4.9,
        totalRatings: 155,
        successRate: 99,
        historicalSpeedRatio: 1.12,
        notes: 'Westside head of interior vehicle care and cabin sanitization.'
      },
      {
        name: 'Ruwan Kumara',
        phone: '+94774567002',
        email: 'ruwan.k@servicecenter.dev',
        specialization: 'Full Body Foam & Under-Chassis Wash Master',
        experienceYears: 7,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Underbody Jet Wash', 'Multi-stage Polish', 'Hydrophobic Coating'],
        totalJobs: 170,
        completedJobs: 165,
        averageRating: 4.8,
        totalRatings: 130,
        successRate: 97,
        historicalSpeedRatio: 1.09,
        notes: 'Chassis preservation and complete body foam treatment specialist.'
      },
      {
        name: 'Pradeep Jayawardena',
        phone: '+94774567003',
        email: 'pradeep.j@servicecenter.dev',
        specialization: 'Ceramic Sealant & Hybrid Protection Expert',
        experienceYears: 6,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Ceramic Coating', 'Rotary Polishing', 'Scratch Removal'],
        totalJobs: 135,
        completedJobs: 130,
        averageRating: 4.7,
        totalRatings: 102,
        successRate: 96,
        historicalSpeedRatio: 1.06,
        notes: 'Paint correction and ceramic sealant veteran.'
      },
      {
        name: 'Mahesh Theekshana',
        phone: '+94774567004',
        email: 'mahesh.t@servicecenter.dev',
        specialization: 'High-Speed Express Detailing Specialist',
        experienceYears: 5,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Express Foam Wash', 'Glass Treatment', 'Rim Decontamination'],
        totalJobs: 110,
        completedJobs: 108,
        averageRating: 4.8,
        totalRatings: 88,
        successRate: 98,
        historicalSpeedRatio: 1.05,
        notes: 'High efficiency specialist with exceptional turnaround speed.'
      },
      {
        name: 'Charith Asalanka',
        phone: '+94774567005',
        email: 'charith.a@servicecenter.dev',
        specialization: 'Exterior Foam & Wax Detailer',
        experienceYears: 3.5,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Hand Waxing', 'Tar Removal', 'Alloy Cleaning'],
        totalJobs: 70,
        completedJobs: 64,
        averageRating: 4.3,
        totalRatings: 50,
        successRate: 91,
        historicalSpeedRatio: 0.99,
        notes: 'Skilled mid-level detailer focused on exterior paint care.'
      },
      {
        name: 'Pathum Nissanka',
        phone: '+94774567006',
        email: 'pathum.n@servicecenter.dev',
        specialization: 'Seat Shampooing & Cabin Care Technician',
        experienceYears: 3,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Fabric Shampoo', 'Trunk Cleaning', 'AC Duct Freshening'],
        totalJobs: 58,
        completedJobs: 52,
        averageRating: 4.2,
        totalRatings: 40,
        successRate: 89,
        historicalSpeedRatio: 0.97,
        notes: 'Interior fabric and upholstery care technician.'
      },
      {
        name: 'Dhananjaya Silva',
        phone: '+94774567007',
        email: 'dhananjaya.s@servicecenter.dev',
        specialization: 'Standard Body Wash & Rinse Specialist',
        experienceYears: 2,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Pre-soak', 'Two-bucket Wash', 'Window Tint Cleaning'],
        totalJobs: 42,
        completedJobs: 36,
        averageRating: 4.0,
        totalRatings: 28,
        successRate: 86,
        historicalSpeedRatio: 0.96,
        notes: 'Body wash technician handling daily standard bookings.'
      },
      {
        name: 'Wanindu Hasaranga',
        phone: '+94774567008',
        email: 'wanindu.h@servicecenter.dev',
        specialization: 'Junior Wash Bay Assistant',
        experienceYears: 1.2,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Wheel Cleaning', 'Pressure Rinse'],
        totalJobs: 20,
        completedJobs: 16,
        averageRating: 3.6,
        totalRatings: 15,
        successRate: 79,
        historicalSpeedRatio: 0.89,
        notes: 'Junior technician gaining field experience on wheel and rinse bays.'
      },
      {
        name: 'Kusal Mendis',
        phone: '+94774567009',
        email: 'kusal.m@servicecenter.dev',
        specialization: 'Trainee Mat & Vacuum Cleaner',
        experienceYears: 0.8,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Foot mat Wash', 'Dusting', 'Drying'],
        totalJobs: 14,
        completedJobs: 10,
        averageRating: 3.4,
        totalRatings: 10,
        successRate: 75,
        historicalSpeedRatio: 0.84,
        notes: 'Apprentice technician assisting on vehicle drying and dusting.'
      },
      {
        name: 'Bhanuka Rajapaksa',
        phone: '+94774567010',
        email: 'bhanuka.r@servicecenter.dev',
        specialization: 'Probationary Service Bay Helper',
        experienceYears: 0.5,
        status: 'active',
        serviceCenter: westside._id,
        skills: ['Tire Scrubbing', 'Water Spot Removal Assist'],
        totalJobs: 9,
        completedJobs: 6,
        averageRating: 3.2,
        totalRatings: 7,
        successRate: 71,
        historicalSpeedRatio: 0.80,
        notes: 'New trainee learning detailing safety and chemical usage.'
      }
    ];
    await Technician.insertMany(westsideTechs);
    console.log('Seeded 10 technicians for Westside Auto Care');
  }
}

async function ensureAppointments() {
  const downtown = await ServiceCenter.findOne({ name: 'Downtown Service Center' });
  const westside = await ServiceCenter.findOne({ name: 'Westside Auto Care' });
  const service = await Service.findOne();

  // If downtown appointments exist without serviceCenter, link them
  if (downtown) {
    await Appointment.updateMany(
      { $or: [{ serviceCenter: null }, { serviceCenter: { $exists: false } }] },
      { $set: { serviceCenter: downtown._id } }
    );
  }

  // Ensure Westside Auto Care has sample queue appointments
  if (westside && service) {
    const westsideAppts = await Appointment.countDocuments({ serviceCenter: westside._id });
    if (westsideAppts === 0) {
      await Appointment.insertMany([
        {
          customerName: 'Saman Kumara',
          customerEmail: 'saman@example.com',
          customerPhone: '+94712345678',
          serviceCenter: westside._id,
          service: service._id,
          serviceId: service._id.toString(),
          serviceName: service.name,
          preferredDate: new Date().toISOString().split('T')[0],
          preferredTime: '10:00 AM',
          queueNumber: 201,
          confirmationCode: 'APPT-0201',
          status: 'in_progress',
          queueStatus: 'serving',
          estimatedCost: service.basePrice || 25,
          estimatedDuration: service.duration || 30
        },
        {
          customerName: 'Dilani Silva',
          customerEmail: 'dilani@example.com',
          customerPhone: '+94719876543',
          serviceCenter: westside._id,
          service: service._id,
          serviceId: service._id.toString(),
          serviceName: service.name,
          preferredDate: new Date().toISOString().split('T')[0],
          preferredTime: '11:30 AM',
          queueNumber: 202,
          confirmationCode: 'APPT-0202',
          status: 'booked',
          queueStatus: 'waiting',
          estimatedCost: service.basePrice || 25,
          estimatedDuration: service.duration || 30
        }
      ]);
      console.log('Seeded sample appointments for Westside Auto Care');
    }
  }
}

async function ensurePayments() {
  const downtown = await ServiceCenter.findOne({ name: 'Downtown Service Center' });
  const westside = await ServiceCenter.findOne({ name: 'Westside Auto Care' });

  // 1. Assign existing payments without serviceCenter based on their appointment or to Downtown
  const unassignedPayments = await Payment.find({
    $or: [{ serviceCenter: null }, { serviceCenter: { $exists: false } }]
  });

  for (const payment of unassignedPayments) {
    if (payment.appointmentId) {
      const appt = await Appointment.findOne({
        $or: [
          { confirmationCode: payment.appointmentId },
          { _id: payment.appointmentId.match(/^[0-9a-fA-F]{24}$/) ? payment.appointmentId : null }
        ]
      });
      if (appt?.serviceCenter) {
        payment.serviceCenter = appt.serviceCenter;
        await payment.save();
        continue;
      }
    }
    if (downtown) {
      payment.serviceCenter = downtown._id;
      await payment.save();
    }
  }

  // 2. Ensure Westside has at least one sample payment record for testing
  if (westside) {
    const westsidePayments = await Payment.countDocuments({ serviceCenter: westside._id });
    if (westsidePayments === 0) {
      await Payment.create({
        customerName: 'Saman Kumara',
        appointmentId: 'APPT-0201',
        serviceName: 'Device Diagnostics & Inspection',
        serviceCost: 2500,
        laborCost: 1500,
        amount: 4000,
        subtotal: 4000,
        paymentMethod: 'cash',
        status: 'completed',
        serviceCenter: westside._id,
        invoiceId: 'INV-W0201',
        description: 'Periodic inspection for Westside Auto Care walk-in',
        date: new Date().toLocaleDateString()
      });
      console.log('Seeded sample payment for Westside Auto Care');
    }
  }
}

async function ensureLoyalty() {
  const downtown = await ServiceCenter.findOne({ name: 'Downtown Service Center' });
  const westside = await ServiceCenter.findOne({ name: 'Westside Auto Care' });

  // Initialize branch loyalty for Downtown customers
  if (downtown) {
    const downtownAppts = await Appointment.find({ serviceCenter: downtown._id }).select('customer customerPhone');
    const downtownPhones = downtownAppts.map(a => a.customerPhone).filter(Boolean);
    const downtownCustomerIds = downtownAppts.map(a => a.customer).filter(Boolean);

    const downtownCustomers = await Customer.find({
      $or: [
        { _id: { $in: downtownCustomerIds } },
        { phone: { $in: downtownPhones } },
        { name: /Nipuni|Pawani|Kamal/i }
      ]
    });

    for (const c of downtownCustomers) {
      if (!c.branchLoyalty) c.branchLoyalty = [];
      let bRec = c.branchLoyalty.find(b => b.serviceCenter?.toString() === downtown._id.toString());
      if (!bRec) {
        const pts = Math.max(10, c.loyaltyPoints || 10);
        c.branchLoyalty.push({ serviceCenter: downtown._id, points: pts });
        c.loyaltyTransactions.push({
          type: 'earn',
          points: pts,
          serviceCenter: downtown._id,
          note: 'Points earned at Downtown Service Center'
        });
        await c.save();
      }
    }
  }

  // Initialize branch loyalty for Westside customers
  if (westside) {
    const westsideAppts = await Appointment.find({ serviceCenter: westside._id }).select('customer customerPhone');
    const westsidePhones = westsideAppts.map(a => a.customerPhone).filter(Boolean);
    const westsideCustomerIds = westsideAppts.map(a => a.customer).filter(Boolean);

    const westsideCustomers = await Customer.find({
      $or: [
        { _id: { $in: westsideCustomerIds } },
        { phone: { $in: westsidePhones } },
        { name: /Saman|Dilani|Sandu/i }
      ]
    });

    for (const c of westsideCustomers) {
      if (!c.branchLoyalty) c.branchLoyalty = [];
      let bRec = c.branchLoyalty.find(b => b.serviceCenter?.toString() === westside._id.toString());
      if (!bRec) {
        const pts = Math.max(15, c.loyaltyPoints || 15);
        c.branchLoyalty.push({ serviceCenter: westside._id, points: pts });
        c.loyaltyTransactions.push({
          type: 'earn',
          points: pts,
          serviceCenter: westside._id,
          note: 'Points earned at Westside Auto Care'
        });
        await c.save();
      }
    }
  }
}

async function bootstrapData() {
  await ensureServiceCenters();
  await ensureAdminUsers();
  await ensureServices();
  await ensureTechnicians();
  await ensureAppointments();
  await ensurePayments();
  await ensureLoyalty();
}

module.exports = {
  bootstrapData
};
