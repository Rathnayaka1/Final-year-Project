async function testEndpoint() {
  try {
    const loginRes = await fetch('http://127.0.0.1:5004/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@servicecenter.dev', password: 'Admin123!' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData);

    if (!loginData.token) return;

    const res = await fetch('http://127.0.0.1:5004/api/customers/admin/loyalty', {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const data = await res.json();
    console.log('Customers Response:', data);
  } catch(e) {
    console.error(e);
  }
}
testEndpoint();
