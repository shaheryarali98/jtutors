const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.classSession.findMany({
  select: { id: true, pencilSpaceId: true, pencilSpaceUrl: true, bookingId: true, status: true }
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
}).catch(e => console.error(e)).finally(() => p.$disconnect());
