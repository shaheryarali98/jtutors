/**
 * E2E flow test — runs against http://localhost:5000
 * Tests: Register student → Register tutor → Student books → Dev checkout → Payment confirmed
 * NOTE: Admin login tested separately; booking does NOT require tutor approval.
 */
const http = require('http');

const BASE = 'http://localhost:5000/api';
const TS = Date.now();

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: 'localhost',
      port: 5000,
      path: '/api' + path,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  let pass = 0, fail = 0;

  function check(label, condition, extra = '') {
    if (condition) { console.log(`  ✅ ${label}`); pass++; }
    else           { console.log(`  ❌ ${label}${extra ? ' — ' + extra : ''}`); fail++; }
  }

  // ── 1. Public settings ──────────────────────────────────────────────────────
  console.log('\n[1] Public Settings');
  const settings = await req('GET', '/settings/public');
  check('HTTP 200', settings.status === 200);
  check('studentFeePercentage present', settings.body.settings?.studentFeePercentage != null, JSON.stringify(settings.body.settings?.studentFeePercentage));
  check('platformCommissionPercent present', settings.body.settings?.platformCommissionPercent != null);
  check('adminCommissionPercentage = 9.25', settings.body.settings?.adminCommissionPercentage === 9.25, settings.body.settings?.adminCommissionPercentage);

  // ── 2. Register student ─────────────────────────────────────────────────────
  console.log('\n[2] Student Registration');
  const studentEmail = `teststudent_${TS}@test.com`;
  const sReg = await req('POST', '/auth/register', { email: studentEmail, password: 'Test1234!', role: 'STUDENT' });
  check('Register student HTTP 2xx', sReg.status >= 200 && sReg.status < 300, sReg.status + ' ' + JSON.stringify(sReg.body?.error));
  const studentToken = sReg.body?.token;
  const studentId = sReg.body?.user?.id;
  check('Got student token', !!studentToken);

  // ── 3. Register tutor ───────────────────────────────────────────────────────
  console.log('\n[3] Tutor Registration');
  const tutorEmail = `testtutor_${TS}@test.com`;
  const tReg = await req('POST', '/auth/register', { email: tutorEmail, password: 'Test1234!', role: 'TUTOR' });
  check('Register tutor HTTP 2xx', tReg.status >= 200 && tReg.status < 300, JSON.stringify(tReg.body?.error));
  const tutorToken = tReg.body?.token;
  check('Got tutor token', !!tutorToken);

  // ── 4. Tutor profile / hourly fee ────────────────────────────────────────────
  console.log('\n[4] Tutor Sets Hourly Fee');
  const tProfile = await req('PUT', '/tutor/profile/personal', {
    firstName: 'Test', lastName: 'Tutor', hourlyFee: 100, bio: 'Test bio for E2E'
  }, tutorToken);
  check('Update tutor profile', tProfile.status >= 200 && tProfile.status < 300, JSON.stringify(tProfile.body?.error));
  // The profile update returns { tutor: { id, ... } } — use this as the booking tutorId
  const tutorProfileId = tProfile.body?.tutor?.id;
  check('Got tutor profile ID', !!tutorProfileId, `response: ${JSON.stringify(tProfile.body)}`);
  console.log(`  → Tutor profile ID: ${tutorProfileId}`);

  // ── 5. Admin login (optional — used to test admin API, not required for booking) ──
  console.log('\n[5] Admin Login');
  const aLogin = await req('POST', '/auth/login', { email: 'admin123@gmail.com', password: 'Admin123!' });
  check('Admin login HTTP 200', aLogin.status === 200, JSON.stringify(aLogin.body?.error));
  const adminToken = aLogin.body?.token;
  if (!adminToken) console.log('  ⚠  Admin login failed — admin-only steps will be skipped');

  // ── 6. Student gets tutor list ───────────────────────────────────────────────
  console.log('\n[6] Student Browses Tutors');
  const browse = await req('GET', '/student/tutors', null, studentToken);
  check('Browse tutors HTTP 200', browse.status === 200, JSON.stringify(browse.body?.error));
  check('Returns tutors array', Array.isArray(browse.body?.tutors));
  console.log(`  → ${browse.body?.tutors?.length ?? 0} tutor(s) visible`);

  // ── 7. Student creates booking ───────────────────────────────────────────────
  console.log('\n[7] Student Creates Booking');
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 86400000 + 3600000).toISOString();
  const bCreate = await req('POST', '/student/bookings', {
    tutorId: tutorProfileId,
    startTime: start,
    endTime: end,
    message: 'E2E test booking'
  }, studentToken);
  check('Create booking HTTP 2xx', bCreate.status >= 200 && bCreate.status < 300, JSON.stringify(bCreate.body?.error));
  const bookingId = bCreate.body?.booking?.id;
  check('Got booking ID', !!bookingId);
  console.log(`  → Booking ID: ${bookingId}`);

  // ── 8. Dev bypass checkout ───────────────────────────────────────────────────
  console.log('\n[8] Dev Bypass Checkout (DEV_BYPASS_STRIPE=true)');
  const checkout = await req('POST', '/payments/checkout', { bookingId }, studentToken);
  check('Checkout HTTP 2xx', checkout.status >= 200 && checkout.status < 300, JSON.stringify(checkout.body?.error));
  check('Got redirect URL', !!checkout.body?.url);
  check('URL is dev mock', checkout.body?.url?.includes('/dev/mock-checkout'));
  check('Breakdown returned', !!checkout.body?.breakdown);
  if (checkout.body?.breakdown) {
    const bd = checkout.body.breakdown;
    const expectedTotal = Math.round(bd.basePriceDollars * 1.045 * 100) / 100;
    const expectedPayout = Math.round(bd.basePriceDollars * 0.90 * 100) / 100;
    check('totalDue ≈ base × 1.045', Math.abs(bd.totalDueDollars - expectedTotal) < 0.02, `got $${bd.totalDueDollars}, expected $${expectedTotal}`);
    check('tutorPayout ≈ base × 0.90', Math.abs(bd.tutorPayoutDollars - expectedPayout) < 0.02, `got $${bd.tutorPayoutDollars}, expected $${expectedPayout}`);
    console.log(`\n  💰 Fee breakdown for $${bd.basePriceDollars}/hr session:`);
    console.log(`     Student pays:       $${bd.totalDueDollars}  (base + 4.5% service fee)`);
    console.log(`     Service fee:        $${bd.studentFeeDollars}  (4.5% → goes to admin)`);
    console.log(`     Admin commission:   $${bd.adminCommissionDollars}  (10%)`);
    console.log(`     Admin total:        $${(bd.studentFeeDollars + bd.adminCommissionDollars).toFixed(2)}  (14.5% of base)`);
    console.log(`     Tutor payout:       $${bd.tutorPayoutDollars}  (90% of base)`);
  }

  // ── 9. Dev confirm payment ───────────────────────────────────────────────────
  console.log('\n[9] Dev Confirm Payment');
  const myBookings = await req('GET', '/student/bookings', null, studentToken);
  const myBooking = myBookings.body?.bookings?.find(b => b.id === bookingId);
  const pId = myBooking?.payment?.id;
  check('Payment record exists on booking', !!pId, `booking: ${JSON.stringify(myBooking)}`);

  if (pId) {
    const confirm = await req('POST', `/dev/confirm-payment`, { paymentId: pId }, studentToken);
    check('Dev confirm HTTP 2xx', confirm.status >= 200 && confirm.status < 300, JSON.stringify(confirm.body));
    check('Payment status = PAID', confirm.body?.payment?.paymentStatus === 'PAID', confirm.body?.payment?.paymentStatus);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${pass} passed, ${fail} failed`);
  if (fail === 0) console.log('🎉 All tests passed — full flow is working!');
  else console.log('⚠️  Some tests failed — see above');
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
