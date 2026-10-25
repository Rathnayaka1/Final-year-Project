require('./src/config/dnsFix');
const mongoose = require('mongoose');
const Technician = require('./src/models/Technician');
const ServiceCenter = require('./src/models/ServiceCenter');

const downtownTechnicians = [
  // 4 HIGH
  {
    name: 'Kasun Perera',
    phone: '+94771234567',
    email: 'kasun.p@servicecenter.dev',
    specialization: 'Full Body & Ceramic Coating Specialist',
    experienceYears: 8,
    status: 'active',
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
    skills: ['Clay Bar Treatment', 'Wax Application', 'Foam Wash', 'Swirl Removal'],
    totalJobs: 125,
    completedJobs: 120,
    averageRating: 4.7,
    totalRatings: 95,
    successRate: 96,
    historicalSpeedRatio: 1.05,
    notes: 'High speed paint protection and exterior mirror shine.'
  },

  // 3 MEDIUM
  {
    name: 'Nuwan Pradeep',
    phone: '+94773456703',
    email: 'nuwan.p@servicecenter.dev',
    specialization: 'Standard Body Wash & Interior Cleaner',
    experienceYears: 3,
    status: 'active',
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
    skills: ['High-Pressure Rinse', 'Dashboard Dressing', 'Tire Shine'],
    totalJobs: 48,
    completedJobs: 42,
    averageRating: 4.1,
    totalRatings: 30,
    successRate: 88,
    historicalSpeedRatio: 0.96,
    notes: 'Quick turnaround technician for express service lines.'
  },

  // 3 LOW
  {
    name: 'Asela Gunaratne',
    phone: '+94773456706',
    email: 'asela.g@servicecenter.dev',
    specialization: 'Junior Exterior Wash Assistant',
    experienceYears: 1,
    status: 'active',
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

const westsideTechnicians = [
  // 4 HIGH
  {
    name: 'Sunera Silva',
    phone: '+94774567001',
    email: 'sunera.s@servicecenter.dev',
    specialization: 'Interior Deep Detailing & Steam Extraction Lead',
    experienceYears: 8,
    status: 'active',
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
    skills: ['Express Foam Wash', 'Glass Treatment', 'Rim Decontamination'],
    totalJobs: 110,
    completedJobs: 108,
    averageRating: 4.8,
    totalRatings: 88,
    successRate: 98,
    historicalSpeedRatio: 1.05,
    notes: 'High efficiency specialist with exceptional turnaround speed.'
  },

  // 3 MEDIUM
  {
    name: 'Charith Asalanka',
    phone: '+94774567005',
    email: 'charith.a@servicecenter.dev',
    specialization: 'Exterior Foam & Wax Detailer',
    experienceYears: 3.5,
    status: 'active',
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
    skills: ['Pre-soak', 'Two-bucket Wash', 'Window Tint Cleaning'],
    totalJobs: 42,
    completedJobs: 36,
    averageRating: 4.0,
    totalRatings: 28,
    successRate: 86,
    historicalSpeedRatio: 0.96,
    notes: 'Body wash technician handling daily standard bookings.'
  },

  // 3 LOW
  {
    name: 'Wanindu Hasaranga',
    phone: '+94774567008',
    email: 'wanindu.h@servicecenter.dev',
    specialization: 'Junior Wash Bay Assistant',
    experienceYears: 1.2,
    status: 'active',
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

async function seed() {
  try {
    require('dotenv').config();
    const connectDB = require('./src/config/db');
    const isConnected = await connectDB();
    if (!isConnected) {
      console.error('Failed to connect to database!');
      process.exit(1);
    }

    const downtown = await ServiceCenter.findOne({ name: 'Downtown Service Center' });
    const westside = await ServiceCenter.findOne({ name: 'Westside Auto Care' });

    if (!downtown || !westside) {
      console.error('Service centers not found! Downtown:', Boolean(downtown), 'Westside:', Boolean(westside));
      process.exit(1);
    }

    console.log(`Found Downtown (${downtown._id}) and Westside (${westside._id})`);

    // Remove existing technicians
    const delRes = await Technician.deleteMany({});
    console.log(`Deleted ${delRes.deletedCount} old technicians.`);

    // Assign service center IDs
    const dMapped = downtownTechnicians.map((t) => ({ ...t, serviceCenter: downtown._id }));
    const wMapped = westsideTechnicians.map((t) => ({ ...t, serviceCenter: westside._id }));

    // Insert new technicians
    const dInserted = await Technician.insertMany(dMapped);
    const wInserted = await Technician.insertMany(wMapped);

    console.log(`Inserted ${dInserted.length} technicians for Downtown Service Center`);
    console.log(`Inserted ${wInserted.length} technicians for Westside Auto Care`);

    console.log('✅ Successfully seeded all 20 technicians!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
