/**
 * patch-tutor-stripe.js
 * Manually set a tutor's Stripe Connect account ID for local testing.
 *
 * Usage:
 *   node scripts/patch-tutor-stripe.js <tutorEmail> <stripeAccountId>
 *
 * Example:
 *   node scripts/patch-tutor-stripe.js sarah.johnson@test.com acct_1234567890abcdef
 *
 * To bypass Stripe Connect check entirely for testing (set a fake account):
 *   node scripts/patch-tutor-stripe.js sarah.johnson@test.com acct_TEST_BYPASS --bypass
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const [, , email, stripeAccountId, flag] = process.argv

  if (!email || !stripeAccountId) {
    console.error('Usage: node scripts/patch-tutor-stripe.js <tutorEmail> <stripeAccountId>')
    console.error('Example: node scripts/patch-tutor-stripe.js sarah.johnson@test.com acct_1234567890abcdef')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tutor: true },
  })

  if (!user) {
    console.error(`❌ User not found: ${email}`)
    process.exit(1)
  }
  if (!user.tutor) {
    console.error(`❌ User ${email} is not a tutor`)
    process.exit(1)
  }

  const updated = await prisma.tutor.update({
    where: { id: user.tutor.id },
    data: {
      stripeAccountId,
      stripeOnboarded: true,
    },
  })

  console.log(`✅ Tutor updated:`)
  console.log(`   Name    : ${user.firstName} ${user.lastName}`)
  console.log(`   Email   : ${email}`)
  console.log(`   TutorID : ${updated.id}`)
  console.log(`   Stripe  : ${updated.stripeAccountId} (onboarded: ${updated.stripeOnboarded})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
