const http = require('http');

function request(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function test() {
  const json = { 'Content-Type': 'application/json' };

  console.log('--- Session (unauthenticated) ---');
  let res = await request('GET', '/api/auth/session', {});
  console.log('status', res.status, '| raw body:', res.data);

  console.log('\n--- Login (demo) ---');
  res = await request('POST', '/api/auth/login', json, JSON.stringify({ email: 'demo@healthspan.com', password: 'demo123' }));
  const loginCookie = (res.headers['set-cookie'] || []).join('; ');
  console.log('status', res.status, '| body:', res.data);
  s = JSON.parse(res.data);
  console.log('authenticated:', s.authenticated, '| user:', s.user && s.user.email);

  const authHeaders = { ...json, Cookie: loginCookie };

  console.log('\n--- Session (authenticated) ---');
  res = await request('GET', '/api/auth/session', { Cookie: loginCookie });
  s = JSON.parse(res.data);
  console.log('status', res.status, '| authenticated:', s.authenticated, '| user:', s.user && s.user.email);

  console.log('\n--- Export (demo) ---');
  res = await request('POST', '/api/export', authHeaders, JSON.stringify({ format: 'json' }));
  const exported = JSON.parse(res.data);
  console.log('status', res.status);
  console.log('exported user:', exported.profile && exported.profile.fullName);
  console.log('body metrics:', exported.timeSeries && exported.timeSeries.bodyMetrics.length);
  console.log('lab results:', exported.timeSeries && exported.timeSeries.labResults.length);

  console.log('\n--- Health-data GET (demo) ---');
  res = await request('GET', '/api/health-data', { Cookie: loginCookie });
  const hd = JSON.parse(res.data);
  console.log('status', res.status, '| success:', hd.success);
  if (hd.success && hd.store) {
    console.log('store user:', hd.store.userId, '| body:', hd.store.timeSeries.bodyMetrics.length, '| lab:', hd.store.timeSeries.labResults.length);
  } else {
    console.log('raw:', res.data);
  }

  console.log('\n--- Login admin ---');
  res = await request('POST', '/api/auth/login', json, JSON.stringify({ email: 'admin@healthspan.com', password: 'admin123' }));
  s = JSON.parse(res.data);
  console.log('status', res.status, '| authenticated:', s.authenticated, '| user:', s.user && s.user.email);
  const adminCookie = (res.headers['set-cookie'] || []).join('; ');

  console.log('\n--- Export (admin) ---');
  res = await request('POST', '/api/export', { ...json, Cookie: adminCookie }, JSON.stringify({ format: 'json' }));
  if (res.status !== 200) {
    console.log('status', res.status, '| raw:', res.data);
  } else {
    const adminExported = JSON.parse(res.data);
    console.log('status', res.status, '| exported user:', adminExported.profile && adminExported.profile.fullName);
    console.log('body metrics:', adminExported.timeSeries && adminExported.timeSeries.bodyMetrics.length);
    console.log('lab results:', adminExported.timeSeries && adminExported.timeSeries.labResults.length);
    console.log('audit:', adminExported.auditTrail && adminExported.auditTrail.length);
  }

  console.log('\n--- Bad password login (expect 401) ---');
  res = await request('POST', '/api/auth/login', json, JSON.stringify({ email: 'demo@healthspan.com', password: 'wrong' }));
  console.log('status', res.status);

  console.log('\n--- Export without auth (expect 401) ---');
  res = await request('POST', '/api/export', json, JSON.stringify({ format: 'json' }));
  console.log('status', res.status);
}

test().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
