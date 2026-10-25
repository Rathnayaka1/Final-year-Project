require('./src/config/dnsFix');
const mongoose = require('mongoose');
require('dotenv').config();

const Technician = require('./src/models/Technician');
const ServiceCenter = require('./src/models/ServiceCenter');

const sampleTechnicians = [
  // --- Auto miraj (69e25ddd5e1a8269a14ba3ee) ---
  {
    name: 'Kasun Bandara',
    phone: '0771239841',
    email: 'kasun.b@automiraj.dev',
    specialization: 'Interior Deep Clean & Steam Wash',
    experienceYears: 6,
    status: 'active',
    centerName: 'Auto miraj',
    skills: ['Interior Steam Wash', 'Leather Conditioning', 'Odor Removal'],
    totalJobs: 175,
    averageRating: 4.9,
    successRate: 98
  },
  {
    name: 'Chamara Senanayake',
    phone: '0772349842',
    email: 'chamara.s@automiraj.dev',
    specialization: 'Full Body Paint & Foam Wash',
    experienceYears: 4,
    status: 'active',
    centerName: 'Auto miraj',
    skills: ['Foam Wash', 'Waxing', 'Wheel Cleaning'],
    totalJobs: 110,
    averageRating: 4.7,
    successRate: 95
  },
  {
    name: 'Lahiru Madushanka',
    phone: '0773459843',
    email: 'lahiru.m@automiraj.dev',
    specialization: 'Express Vacuum & Quick Lube',
    experienceYears: 2,
    status: 'active',
    centerName: 'Auto miraj',
    skills: ['Vacuuming', 'Window Cleaning', 'Fluid Top-up'],
    totalJobs: 54,
    averageRating: 4.4,
    successRate: 91
  },
  {
    name: 'Dilshan Priyadarshana',
    phone: '0774569844',
    email: 'dilshan.p@automiraj.dev',
    specialization: 'Van & Heavy Vehicle Wash Specialist',
    experienceYears: 8,
    status: 'active',
    centerName: 'Auto miraj',
    skills: ['Van Wash', 'High-Pressure Undercarriage', 'Engine Bay Wash'],
    totalJobs: 230,
    averageRating: 4.8,
    successRate: 97
  },

  // --- Auto Care (69e25ddd5e1a8269a14ba3f0) ---
  {
    name: 'Nuwan Wijesinghe',
    phone: '0775679845',
    email: 'nuwan.w@autocare.dev',
    specialization: 'Full Body Ceramic Coating & Wash',
    experienceYears: 7,
    status: 'active',
    centerName: 'Auto Care',
    skills: ['Full Body Wash', 'Ceramic Polish', 'Paint Protection'],
    totalJobs: 195,
    averageRating: 4.9,
    successRate: 99
  },
  {
    name: 'Pradeep Kumara',
    phone: '0776789846',
    email: 'pradeep.k@autocare.dev',
    specialization: 'Interior Detailing & Carpet Extraction',
    experienceYears: 5,
    status: 'active',
    centerName: 'Auto Care',
    skills: ['Deep Extraction', 'Roof Liner Clean', 'Dashboard Treatment'],
    totalJobs: 130,
    averageRating: 4.7,
    successRate: 96
  },
  {
    name: 'Kavinda Jayasuriya',
    phone: '0777899847',
    email: 'kavinda.j@autocare.dev',
    specialization: 'Express Body Wash & Tire Shine',
    experienceYears: 3,
    status: 'active',
    centerName: 'Auto Care',
    skills: ['Quick Wash', 'Tire Gloss', 'Drying & Buffing'],
    totalJobs: 78,
    averageRating: 4.5,
    successRate: 93
  },
  {
    name: 'Roshan Samarasekera',
    phone: '0778909848',
    email: 'roshan.s@autocare.dev',
    specialization: 'SUV & Cab Detailing Master',
    experienceYears: 9,
    status: 'active',
    centerName: 'Auto Care',
    skills: ['Cab Detailing', 'Mud Off-road Clean', 'Interior Restoration'],
    totalJobs: 245,
    averageRating: 4.8,
    successRate: 98
  },

  // --- Westside Auto Care (69e25ddd5e1a8269a14ba3ef) ---
  {
    name: 'Mahesh Jayawardena',
    phone: '0779019849',
    email: 'mahesh.j@westside.dev',
    specialization: 'Premium Interior Deep Sanitation',
    experienceYears: 7,
    status: 'active',
    centerName: 'Westside Auto Care',
    skills: ['Antiviral Sanitation', 'Leather Seat Care', 'AC Vent Disinfection'],
    totalJobs: 185,
    averageRating: 4.9,
    successRate: 98
  },
  {
    name: 'Sanjeewa Gunaratne',
    phone: '0770129850',
    email: 'sanjeewa.g@westside.dev',
    specialization: 'Full Body Hydrophobic Wash',
    experienceYears: 5,
    status: 'active',
    centerName: 'Westside Auto Care',
    skills: ['Hydrophobic Wax', 'Wheel Arch Cleaning', 'Glass Polish'],
    totalJobs: 125,
    averageRating: 4.6,
    successRate: 94
  },
  {
    name: 'Asanka Karunaratne',
    phone: '0771230851',
    email: 'asanka.k@westside.dev',
    specialization: 'Junior Express Cleaner',
    experienceYears: 1,
    status: 'active',
    centerName: 'Westside Auto Care',
    skills: ['Hand Wash', 'Vacuuming'],
    totalJobs: 28,
    averageRating: 4.2,
    successRate: 88
  },

  // --- Downtown Service Center (6ace068f2e8b24a987dac337) ---
  {
    name: 'Dhanushka Alwis',
    phone: '0772341852',
    email: 'dhanushka.a@downtown.dev',
    specialization: 'Car & Sedan Master Detailer',
    experienceYears: 8,
    status: 'active',
    centerName: 'Downtown Service Center',
    skills: ['Sedan Restoration', 'Nano Coating', 'Precision Interior'],
    totalJobs: 215,
    averageRating: 4.9,
    successRate: 99
  },
  {
    name: 'Suranga Wickramasinghe',
    phone: '0773452853',
    email: 'suranga.w@downtown.dev',
    specialization: 'Full Body Foam Wash Specialist',
    experienceYears: 4,
    status: 'active',
    centerName: 'Downtown Service Center',
    skills: ['Snow Foam Wash', 'Rim Detailing', 'Clay Bar Treatment'],
    totalJobs: 98,
    averageRating: 4.7,
    successRate: 95
  },
  {
    name: 'Chinthaka Ranasinghe',
    phone: '0774563854',
    email: 'chinthaka.r@downtown.dev',
    specialization: 'Commercial Van & MPV Cleaner',
    experienceYears: 6,
    status: 'active',
    centerName: 'Downtown Service Center',
    skills: ['MPV Deep Clean', 'Heavy Duty Wash', 'Fabric Seat Extraction'],
    totalJobs: 140,
    averageRating: 4.6,
    successRate: 93
  }
];

async function seedTechnicians() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const centers = await ServiceCenter.find({});
    const centerByName = {};
    centers.forEach(c => {
      centerByName[c.name.trim().toLowerCase()] = c._id;
    });

    let addedCount = 0;
    for (const techData of sampleTechnicians) {
      const centerId = centerByName[techData.centerName.trim().toLowerCase()];
      if (!centerId) {
        console.warn(`Center not found for ${techData.centerName}`);
        continue;
      }

      // Check if technician with same email already exists
      const exists = await Technician.findOne({ email: techData.email });
      if (exists) {
        console.log(`Technician ${techData.name} already exists, skipping.`);
        continue;
      }

      await Technician.create({
        name: techData.name,
        phone: techData.phone,
        email: techData.email,
        specialization: techData.specialization,
        experienceYears: techData.experienceYears,
        status: techData.status,
        serviceCenter: centerId,
        skills: techData.skills,
        totalJobs: techData.totalJobs,
        averageRating: techData.averageRating,
        successRate: techData.successRate
      });
      console.log(`+ Added technician ${techData.name} to ${techData.centerName}`);
      addedCount++;
    }

    console.log(`\n✅ Finished seeding: ${addedCount} new technicians added.`);
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedTechnicians();
