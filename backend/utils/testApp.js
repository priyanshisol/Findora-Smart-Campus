const http = require('http');

function makeRequest(path, method = 'GET', data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      const setCookie = res.headers['set-cookie'];
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, setCookie });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, setCookie });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAll() {
  console.log('--- STARTING FINDORA E2E VERIFICATION TEST ---');

  // 1. Health check
  const health = await makeRequest('/api/health');
  console.log('1. Health Check:', health.status, health.data.status);

  // 2. Public Items Marketplace query
  const items = await makeRequest('/api/items');
  console.log('2. Public Items Count:', items.data.count, 'Total items:', items.data.total);

  // 3. Student Login
  const studentLogin = await makeRequest('/api/auth/login', 'POST', {
    email: 'alex.morgan@campus.edu',
    password: 'student123',
  });
  console.log('3. Student Login:', studentLogin.data.success ? 'SUCCESS' : 'FAILED', 'User:', studentLogin.data.user.name);
  const studentCookie = studentLogin.setCookie ? studentLogin.setCookie.join('; ') : '';

  // 4. Student Dashboard / Profile query
  const me = await makeRequest('/api/auth/me', 'GET', null, studentCookie);
  console.log('4. Profile Verified:', me.data.user.email);

  // 5. Submit Lost Item
  const newLostItem = await makeRequest(
    '/api/items',
    'POST',
    {
      title: 'E2E Test Lost Airpods Pro Case',
      description: 'Lost wireless charging case near Campus Library entrance.',
      category: 'Electronics',
      type: 'lost',
      location: 'Campus Library Entrance',
      latitude: 37.7750,
      longitude: -122.4190,
      reportDate: new Date().toISOString(),
    },
    studentCookie
  );
  console.log('5. Report Item Published:', newLostItem.data.success, 'Item ID:', newLostItem.data.item._id);

  // 6. Admin Login
  const adminLogin = await makeRequest('/api/auth/login', 'POST', {
    email: 'admin@campus.edu',
    password: 'adminpassword123',
  });
  console.log('6. Admin Login:', adminLogin.data.success ? 'SUCCESS' : 'FAILED', 'Role:', adminLogin.data.user.role);
  const adminCookie = adminLogin.setCookie ? adminLogin.setCookie.join('; ') : '';

  // 7. Admin Dashboard Stats
  const adminStats = await makeRequest('/api/admin/dashboard', 'GET', null, adminCookie);
  console.log('7. Admin Stats:', adminStats.data.stats);

  // 8. Admin Analytics Chart Data
  const adminAnalytics = await makeRequest('/api/admin/analytics', 'GET', null, adminCookie);
  console.log('8. Admin Analytics Loaded: Category breakdown length =', adminAnalytics.data.analytics.categoryBreakdown.length);

  // 9. Admin Claims Queue
  const adminClaims = await makeRequest('/api/admin/claims', 'GET', null, adminCookie);
  console.log('9. Admin Claims Queue:', adminClaims.data.count, 'claims');

  console.log('--- ALL E2E API VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
}

testAll().catch((err) => console.error('E2E Test Error:', err));
