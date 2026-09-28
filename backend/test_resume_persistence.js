const http = require('http');
const db = require('./src/config/db');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runPersistenceTest() {
  console.log('🧪 ========================================================');
  console.log('🧪 STARTING RESUME BUILDER PERSISTENCE VERIFICATION TEST');
  console.log('🧪 ========================================================');

  // Step 1: Initialize DB connection for direct DB assertions
  await db.initDatabase();

  // Step 2: Login as seeker
  console.log('\n[1] Logging in as seeker@example.com...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'seeker@example.com', password: 'password123' }
  );

  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.token;
  const user = loginRes.data.user;
  console.log(`✅ Logged in successfully as User ID: ${user.id} (${user.email}), Role: ${user.role}`);

  // Step 3: Fetch initial resume builder data (Simulating initial Page Mount)
  console.log('\n[2] Fetching initial Resume Builder data (GET /api/resumes/builder/data)...');
  const initialFetch = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/resumes/builder/data',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('Initial fetch status:', initialFetch.status);
  console.log('Initial hasSavedResume:', initialFetch.data.hasSavedResume);
  console.log('Initial resumeId:', initialFetch.data.resumeId);
  console.log('Initial profile name:', initialFetch.data.profile?.first_name, initialFetch.data.profile?.last_name);

  const initialResumeId = initialFetch.data.resumeId;

  // Step 4: Edit Personal Information and Save (Simulating Edit → Save Flow)
  console.log('\n[3] Editing Personal Information fields...');
  const updatedDetails = {
    resumeId: initialResumeId,
    title: 'Senior Full Stack Architect Resume 2026',
    personalInfo: {
      fullName: 'Alexander Hamilton',
      email: 'seeker@example.com',
      phone: '+1 (555) 999-8888',
      location: 'New York, NY',
      headline: 'Principal Distributed Systems Engineer',
    },
    careerObjective: 'Pioneering high-scale distributed systems and cloud microservices.',
    skills: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes'],
    education: [
      {
        degree: 'Master of Science',
        institution: 'Columbia University',
        field: 'Computer Science',
        years: '2019 - 2021',
        grade: '3.95 GPA',
      },
    ],
    experience: [
      {
        title: 'Lead Systems Architect',
        company: 'FinTech Innovations NYC',
        location: 'New York, NY',
        dates: '2021 to Present',
        description: 'Architected high-throughput trading ledger handling 50k transactions/sec.',
      },
    ],
    links: {
      linkedin: 'https://linkedin.com/in/ahamilton-dev',
      github: 'https://github.com/ahamilton-dev',
      portfolio: 'https://ahamilton.dev',
    },
  };

  console.log('Sending Save API Request (POST /api/resumes/builder)...');
  const saveRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/resumes/builder',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    updatedDetails
  );

  console.log('Save response status:', saveRes.status);
  console.log('Save response message:', saveRes.data.message);
  console.log('Saved resumeId:', saveRes.data.resumeId);

  if (!saveRes.data.success) {
    throw new Error('Save failed: ' + JSON.stringify(saveRes.data));
  }
  const savedResumeId = saveRes.data.resumeId;

  // Step 5: Direct Database Verification (PostgreSQL / Relational DB assertions)
  console.log('\n[4] Verifying direct database persistence in PostgreSQL/SQLite...');

  // 5a: Verify job_seekers table updated and associated with correct user_id
  const dbSeeker = await db.query(
    'SELECT * FROM job_seekers WHERE user_id = $1',
    [user.id]
  );
  console.log('Database job_seekers row:', {
    id: dbSeeker.rows[0].id,
    user_id: dbSeeker.rows[0].user_id,
    first_name: dbSeeker.rows[0].first_name,
    last_name: dbSeeker.rows[0].last_name,
    phone: dbSeeker.rows[0].phone,
    headline: dbSeeker.rows[0].headline,
    location: dbSeeker.rows[0].location,
    bio: dbSeeker.rows[0].bio,
  });

  if (dbSeeker.rows[0].first_name !== 'Alexander' || dbSeeker.rows[0].last_name !== 'Hamilton') {
    throw new Error(`DB Assertion Failed: Expected name 'Alexander Hamilton', got '${dbSeeker.rows[0].first_name} ${dbSeeker.rows[0].last_name}'`);
  }
  if (dbSeeker.rows[0].phone !== '+1 (555) 999-8888') {
    throw new Error(`DB Assertion Failed: Expected phone '+1 (555) 999-8888', got '${dbSeeker.rows[0].phone}'`);
  }
  if (dbSeeker.rows[0].headline !== 'Principal Distributed Systems Engineer') {
    throw new Error(`DB Assertion Failed: Expected headline 'Principal Distributed Systems Engineer', got '${dbSeeker.rows[0].headline}'`);
  }
  if (dbSeeker.rows[0].location !== 'New York, NY') {
    throw new Error(`DB Assertion Failed: Expected location 'New York, NY', got '${dbSeeker.rows[0].location}'`);
  }
  console.log('✅ job_seekers table verification passed! Associated with user_id = ' + user.id);

  // 5b: Verify resumes table updated
  const dbResume = await db.query(
    'SELECT * FROM resumes WHERE id = $1 AND job_seeker_id = $2',
    [savedResumeId, dbSeeker.rows[0].id]
  );
  if (dbResume.rows.length === 0) {
    throw new Error(`DB Assertion Failed: Resume ID ${savedResumeId} not found for job_seeker_id ${dbSeeker.rows[0].id}`);
  }
  const parsedResumeData = JSON.parse(dbResume.rows[0].resume_data);
  console.log('Database resumes row parsed:', {
    id: dbResume.rows[0].id,
    title: dbResume.rows[0].title,
    personalInfo: parsedResumeData.personalInfo,
  });

  if (parsedResumeData.personalInfo.fullName !== 'Alexander Hamilton') {
    throw new Error(`DB Assertion Failed: Expected personalInfo.fullName 'Alexander Hamilton', got '${parsedResumeData.personalInfo.fullName}'`);
  }
  if (parsedResumeData.personalInfo.phone !== '+1 (555) 999-8888') {
    throw new Error(`DB Assertion Failed: Expected personalInfo.phone '+1 (555) 999-8888', got '${parsedResumeData.personalInfo.phone}'`);
  }
  console.log('✅ resumes table verification passed!');

  // Step 6: Simulate Page Refresh (Mounting component anew & fetching fresh data)
  console.log('\n[5] Simulating Browser Page Refresh...');
  console.log('Calling GET /api/resumes/builder/data to fetch fresh data after page reload...');
  const refreshedFetch = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/resumes/builder/data',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('Refreshed fetch status:', refreshedFetch.status);
  const refreshedData = refreshedFetch.data;
  console.log('Refreshed Data received by UI:', {
    hasSavedResume: refreshedData.hasSavedResume,
    resumeId: refreshedData.resumeId,
    title: refreshedData.title,
    personalInfo: refreshedData.resumeData?.personalInfo,
    careerObjective: refreshedData.resumeData?.careerObjective,
  });

  if (!refreshedData.hasSavedResume) {
    throw new Error('Refresh Assertion Failed: hasSavedResume should be true!');
  }
  if (refreshedData.resumeData?.personalInfo?.fullName !== 'Alexander Hamilton') {
    throw new Error(`Refresh Assertion Failed: UI got '${refreshedData.resumeData?.personalInfo?.fullName}', expected 'Alexander Hamilton'`);
  }
  if (refreshedData.resumeData?.personalInfo?.phone !== '+1 (555) 999-8888') {
    throw new Error(`Refresh Assertion Failed: UI got phone '${refreshedData.resumeData?.personalInfo?.phone}', expected '+1 (555) 999-8888'`);
  }
  if (refreshedData.resumeData?.personalInfo?.headline !== 'Principal Distributed Systems Engineer') {
    throw new Error(`Refresh Assertion Failed: UI got headline '${refreshedData.resumeData?.personalInfo?.headline}', expected 'Principal Distributed Systems Engineer'`);
  }
  if (refreshedData.resumeData?.personalInfo?.location !== 'New York, NY') {
    throw new Error(`Refresh Assertion Failed: UI got location '${refreshedData.resumeData?.personalInfo?.location}', expected 'New York, NY'`);
  }
  console.log('✅ Refresh test passed! All edited fields persisted across refresh.');

  // Step 7: Verify No Duplicate Resumes Created on Subsequent Edits
  console.log('\n[6] Testing second edit on existing resume to verify no duplicate records created...');
  const secondEdit = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/resumes/builder',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      resumeId: savedResumeId,
      title: 'Senior Full Stack Architect Resume 2026 - Updated',
      personalInfo: {
        fullName: 'Alexander Hamilton, Ph.D.',
        email: 'seeker@example.com',
        phone: '+1 (555) 777-1111',
        location: 'New York, NY',
        headline: 'Principal Distributed Systems Engineer & Tech Lead',
      },
      careerObjective: 'Pioneering high-scale distributed systems and cloud microservices.',
    }
  );

  console.log('Second save response:', secondEdit.data);
  if (secondEdit.data.resumeId !== savedResumeId) {
    throw new Error(`Expected resumeId ${savedResumeId} to be updated, but got new ID ${secondEdit.data.resumeId}`);
  }

  // Count resumes for this seeker
  const resumeCount = await db.query(
    'SELECT COUNT(*) as count FROM resumes WHERE job_seeker_id = $1',
    [dbSeeker.rows[0].id]
  );
  console.log(`Current resume count for seeker ${dbSeeker.rows[0].id}: ${resumeCount.rows[0].count}`);

  console.log('\n======================================================');
  console.log('🎉 ALL PERSISTENCE TESTS PASSED 100% SUCCESSFULLY!');
  console.log('======================================================');
  process.exit(0);
}

runPersistenceTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
