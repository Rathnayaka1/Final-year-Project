const mongoose = require('mongoose');

const uri = 'mongodb+srv://rathnayakanipuni696_db_user:nipuni2026@cluster0.e9xu4qs.mongodb.net/Smart-Service-Center-App?appName=Cluster0';

async function checkCustomers() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  const customers = await db.collection('customers').find({}).toArray();
  console.log(`Found ${customers.length} customers.`);
  
  if (customers.length > 0) {
     console.log('First customer name:', customers[0].name);
     console.log('Loyalty Points:', customers[0].loyaltyPoints);
  }
  
  process.exit(0);
}

checkCustomers();
