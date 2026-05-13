require('dotenv').config();
const apiKey = process.env.PENCIL_SPACES_API_KEY;
console.log('API key present:', !!apiKey, '| Length:', apiKey?.length);

async function test() {
  // Test 1: Create a space
  console.log('\n--- Testing createPencilSpace ---');
  const r1 = await fetch('https://apis.pencilapp.com/public/api/spaces/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Test Session ' + Date.now() }),
  });
  const t1 = await r1.text();
  console.log('Status:', r1.status);
  console.log('Response:', t1.substring(0, 500));

  if (r1.ok) {
    const space = JSON.parse(t1);
    console.log('\nSpace ID:', space.spaceId);
    console.log('Space URL:', space.link);

    // Test 2: Create a user (with required userRole field)
    console.log('\n--- Testing createOrGetPencilUser ---');
    const r2 = await fetch('https://apis.pencilapp.com/public/api/users/createAPIUser', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'teststudent@example.com', name: 'Test Student', userRole: 'student' }),
    });
    const t2 = await r2.text();
    console.log('Status:', r2.status);
    console.log('Response:', t2.substring(0, 500));

    if (r2.ok) {
      const u = JSON.parse(t2);
      const userId = u.user?.id;
      // Test 3: Get join URL
      console.log('\n--- Testing getPencilJoinUrl ---');
      const r3 = await fetch(`https://apis.pencilapp.com/public/api/users/${userId}/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redirectUrl: `${space.link}?standalone=true&startCall=true` }),
      });
      const t3 = await r3.text();
      console.log('Status:', r3.status);
      console.log('Response:', t3.substring(0, 500));
    }
  }
}

test().catch(e => console.error('Error:', e.message));
