const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

(async () => {
  const u = await p.user.findFirst({ where: { role: 'ADMIN' } });
  if (u) {
    console.log('Admin found:', u.email, '| id:', u.id);
    // Reset password to known value
    const h = await bcrypt.hash('Admin123!', 10);
    await p.user.update({ where: { id: u.id }, data: { password: h, emailConfirmed: true } });
    console.log('Password reset to Admin123!');
  } else {
    console.log('No admin user found — creating...');
    const h = await bcrypt.hash('Admin123!', 10);
    await p.user.create({ data: { email: 'admin@jtutor.com', password: h, role: 'ADMIN', emailConfirmed: true } });
    console.log('Admin created: admin@jtutor.com / Admin123!');
  }
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
