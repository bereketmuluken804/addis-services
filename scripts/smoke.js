/**
 * End-to-end smoke verification script for Render deployment and local environments.
 * Sequence:
 *  1. GET /healthz (Database connectivity & service health)
 *  2. POST /api/auth/register/provider (Register provider with ID document)
 *  3. POST /api/auth/login (Admin authentication)
 *  4. PATCH /api/admin/providers/:id/verification (Admin approve verification)
 *  5. PATCH /api/admin/providers/:id/status (Admin activate provider)
 *  6. GET /api/providers (Verify provider is publicly listed)
 *  7. POST /api/leads/call (Record call-click lead event)
 *
 * Usage:
 *   node scripts/smoke.js [baseUrl]
 *   npm run smoke
 */

const baseUrl = (process.argv[2] || process.env.API_BASE_URL || process.env.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123456';

// Minimal 1x1 JPEG magic bytes for ID document upload
const dummyJpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0xff, 0xda, 0x00, 0x08,
  0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9,
]);

async function runSmokeTests() {
  console.log(`[SMOKE] Starting smoke test suite against ${baseUrl}...`);

  // Step 1: Health check
  console.log('\n[SMOKE] 1/7: Checking GET /healthz...');
  const healthRes = await fetch(`${baseUrl}/healthz`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}: ${await healthRes.text()}`);
  }
  const healthData = await healthRes.json();
  if (healthData.status !== 'ok') {
    throw new Error(`Unexpected health payload: ${JSON.stringify(healthData)}`);
  }
  console.log('  -> Health check OK (200 { status: "ok" })');

  // Step 2: Register provider
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
  const testPhone = `+2519${randomSuffix}`;
  const testPassword = 'SmokePassword123!';

  console.log(`\n[SMOKE] 2/7: Registering test provider with phone ${testPhone}...`);
  const formData = new FormData();
  formData.append('phone', testPhone);
  formData.append('password', testPassword);
  formData.append('fullName', `Smoke Test Provider ${randomSuffix}`);
  formData.append('categoryId', '1'); // Plumbing
  formData.append('cityId', '1'); // Addis Ababa
  formData.append('subCityId', '1'); // Bole
  formData.append('bio', 'Automated smoke test provider biography');

  const fileBlob = new Blob([dummyJpegBuffer], { type: 'image/jpeg' });
  formData.append('idDocument', fileBlob, 'id_card.jpg');

  const regRes = await fetch(`${baseUrl}/api/auth/register/provider`, {
    method: 'POST',
    body: formData,
  });

  if (!regRes.ok) {
    throw new Error(`Registration failed with status ${regRes.status}: ${await regRes.text()}`);
  }

  const regData = await regRes.json();
  const providerId = regData.data?.provider?.id;
  if (!providerId) {
    throw new Error(`Missing provider ID in registration response: ${JSON.stringify(regData)}`);
  }
  console.log(`  -> Provider registered successfully (ID: ${providerId}, Status: ${regData.data.provider.verificationStatus}, Active: ${regData.data.provider.isActive})`);

  // Step 3: Admin login
  console.log(`\n[SMOKE] 3/7: Logging in as admin (${adminEmail})...`);
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  const adminToken = loginData.data?.accessToken;
  if (!adminToken) {
    throw new Error(`Missing admin access token: ${JSON.stringify(loginData)}`);
  }
  console.log('  -> Admin login successful');

  // Step 4: Admin approve verification
  console.log(`\n[SMOKE] 4/7: Approving provider verification (ID: ${providerId})...`);
  const approveRes = await fetch(`${baseUrl}/api/admin/providers/${providerId}/verification`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'APPROVED',
    }),
  });

  if (!approveRes.ok) {
    throw new Error(`Approval failed with status ${approveRes.status}: ${await approveRes.text()}`);
  }
  const approveData = await approveRes.json();
  if (approveData.data?.verificationStatus !== 'APPROVED') {
    throw new Error(`Expected verificationStatus APPROVED, got ${approveData.data?.verificationStatus}`);
  }
  console.log('  -> Provider verification approved (verificationStatus: APPROVED)');

  // Step 5: Admin activate provider
  console.log(`\n[SMOKE] 5/7: Activating provider (ID: ${providerId})...`);
  const activateRes = await fetch(`${baseUrl}/api/admin/providers/${providerId}/activation`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      isActive: true,
    }),
  });

  if (!activateRes.ok) {
    throw new Error(`Activation failed with status ${activateRes.status}: ${await activateRes.text()}`);
  }
  const activateData = await activateRes.json();
  if (activateData.data?.isActive !== true) {
    throw new Error(`Expected isActive true, got ${activateData.data?.isActive}`);
  }
  console.log('  -> Provider activated successfully (isActive: true)');

  // Step 6: Public directory listing
  console.log(`\n[SMOKE] 6/7: Verifying provider presence in public directory...`);
  const publicRes = await fetch(`${baseUrl}/api/providers?categoryId=1`);
  if (!publicRes.ok) {
    throw new Error(`Public search failed with status ${publicRes.status}: ${await publicRes.text()}`);
  }
  const publicData = await publicRes.json();
  const found = publicData.data?.some((p) => p.id === providerId);
  if (!found) {
    throw new Error(`Approved provider ${providerId} not found in public directory listings`);
  }
  console.log(`  -> Provider ${providerId} is visible in public directory`);

  // Step 7: Call-click lead recording
  console.log(`\n[SMOKE] 7/7: Recording call-click event on provider ${providerId}...`);
  const callRes = await fetch(`${baseUrl}/api/leads/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      providerId,
    }),
  });

  if (!callRes.ok) {
    throw new Error(`Call-click recording failed with status ${callRes.status}: ${await callRes.text()}`);
  }
  const callData = await callRes.json();
  if (!callData.data?.recorded || callData.data?.providerId !== providerId) {
    throw new Error(`Unexpected call-click payload: ${JSON.stringify(callData)}`);
  }
  console.log(`  -> Call-click recorded successfully: ${JSON.stringify(callData.data)}`);

  console.log('\n========================================================');
  console.log('[SMOKE] ALL 7 SMOKE TESTS PASSED CLEANLY ON ENVIRONMENT');
  console.log('========================================================\n');
}

runSmokeTests().catch((err) => {
  console.error('\n[SMOKE] ERROR:', err.message);
  process.exit(1);
});
