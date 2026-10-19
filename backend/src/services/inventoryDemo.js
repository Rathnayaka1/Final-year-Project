const fs = require('node:fs');
const path = require('node:path');
const Stock = require('../models/Stock');
const ServiceCenter = require('../models/ServiceCenter');

async function seedInventoryDemo() {
  try {
    const downtown = await ServiceCenter.findOne({ name: 'Downtown Service Center' });
    const westside = await ServiceCenter.findOne({ name: 'Westside Auto Care' });

    // 1. Assign any legacy stocks without serviceCenter to Downtown Service Center
    if (downtown) {
      await Stock.updateMany(
        { $or: [{ serviceCenter: null }, { serviceCenter: { $exists: false } }] },
        { $set: { serviceCenter: downtown._id } }
      );
    }

    // 2. Ensure Downtown has stock items
    if (downtown) {
      const downtownStockCount = await Stock.countDocuments({ serviceCenter: downtown._id });
      if (downtownStockCount === 0) {
        const demoPath = path.resolve(__dirname, '../../../inventory-ml/data/demo_stock.json');
        if (fs.existsSync(demoPath)) {
          const items = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
          const seededDowntown = items.map(item => ({
            ...item,
            serviceCenter: downtown._id
          }));
          await Stock.insertMany(seededDowntown);
          console.log('Seeded 20 simulation inventory items for Downtown Service Center.');
        }
      }
    }

    // 3. Ensure Westside Auto Care has stock items
    if (westside) {
      const westsideStockCount = await Stock.countDocuments({ serviceCenter: westside._id });
      if (westsideStockCount === 0) {
        const westsideItems = [
          {
            partName: 'Engine oil 0W-20 (Westside)',
            partNumber: 'W-EO020',
            quantity: 48.0,
            minQuantity: 15,
            unitPrice: 2150.0,
            supplier: 'Westside Suppliers',
            unit: 'litre',
            forecastItemId: 'EO020',
            dataOrigin: 'synthetic_demo',
            serviceCenter: westside._id
          },
          {
            partName: 'Engine oil 10W-40 (Westside)',
            partNumber: 'W-EO1040',
            quantity: 35.0,
            minQuantity: 12,
            unitPrice: 1850.0,
            supplier: 'Westside Suppliers',
            unit: 'litre',
            forecastItemId: 'EO1040',
            dataOrigin: 'synthetic_demo',
            serviceCenter: westside._id
          },
          {
            partName: 'Brake fluid DOT 3',
            partNumber: 'W-BFDOT3',
            quantity: 20.0,
            minQuantity: 8,
            unitPrice: 950.0,
            supplier: 'Westside Suppliers',
            unit: 'can',
            forecastItemId: 'BFDOT3',
            dataOrigin: 'synthetic_demo',
            serviceCenter: westside._id
          },
          {
            partName: 'Brake pad front',
            partNumber: 'W-BPF101',
            quantity: 14.0,
            minQuantity: 6,
            unitPrice: 8500.0,
            supplier: 'Lanka Auto Parts',
            unit: 'axle_set',
            forecastItemId: 'BPF101',
            dataOrigin: 'synthetic_demo',
            serviceCenter: westside._id
          },
          {
            partName: 'Oil filter (Cartridge)',
            partNumber: 'W-OF100',
            quantity: 30.0,
            minQuantity: 10,
            unitPrice: 1500.0,
            supplier: 'Lanka Auto Parts',
            unit: 'piece',
            forecastItemId: 'OF100',
            dataOrigin: 'synthetic_demo',
            serviceCenter: westside._id
          },
          {
            partName: 'Air filter (Heavy Duty)',
            partNumber: 'W-AF200',
            quantity: 18.0,
            minQuantity: 8,
            unitPrice: 2300.0,
            supplier: 'Lanka Auto Parts',
            unit: 'piece',
            forecastItemId: 'AF200',
            dataOrigin: 'synthetic_demo',
            serviceCenter: westside._id
          }
        ];
        await Stock.insertMany(westsideItems);
        console.log('Seeded 6 inventory items for Westside Auto Care.');
      }
    }
  } catch (error) {
    console.error('seedInventoryDemo error:', error.message);
  }
}

module.exports = { seedInventoryDemo };
