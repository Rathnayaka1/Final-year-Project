async function testPaymentCrud() {
  try {
    const loginRes = await fetch('http://127.0.0.1:5004/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@servicecenter.dev', password: 'Admin123!' })
    });
    const { token } = await loginRes.json();
    if (!token) {
      console.log('Login failed');
      return;
    }

    console.log('1. Testing Payment Create with Parts...');
    const createRes = await fetch('http://127.0.0.1:5004/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customerName: 'Test Customer',
        serviceName: 'Full Lubrication Service',
        serviceCost: 4500,
        laborCost: 1000,
        items: [
          { name: 'Engine Oil 10W-40', quantity: 2, unitPrice: 3500, total: 7000 },
          { name: 'Oil Filter', quantity: 1, unitPrice: 1500, total: 1500 }
        ],
        subtotal: 14000,
        discount: 500,
        amount: 13500,
        paymentMethod: 'cash',
        status: 'completed',
        description: 'Testing full payment CRUD flow'
      })
    });

    const createData = await createRes.json();
    console.log('Create Response:', createData);
    const paymentId = createData.payment?.id;

    if (paymentId) {
      console.log('\n2. Testing Payment Update (PATCH)...');
      const updateRes = await fetch(`http://127.0.0.1:5004/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'refunded',
          description: 'Refunded upon customer request'
        })
      });
      const updateData = await updateRes.json();
      console.log('Update Response:', updateData);

      console.log('\n3. Testing Payment Delete (DELETE)...');
      const deleteRes = await fetch(`http://127.0.0.1:5004/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const deleteData = await deleteRes.json();
      console.log('Delete Response:', deleteData);
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

testPaymentCrud();
