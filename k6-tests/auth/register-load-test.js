import http from 'k6/http';
import { check, sleep, fail } from 'k6';

const BASE_URL = 'http://localhost:3000';

/**
 * ==================================
 * TEST CONFIGURATION
 * ==================================
 */
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
  },

  scenarios: {
    /**
     * ==================================
     * 1. PASS TEST (VALID REGISTER FLOW)
     * ==================================
     */
    register_pass_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 2 },
        { duration: '20s', target: 5 },
        { duration: '10s', target: 0 },
      ],
      exec: 'registerPassTest',
    },

    /**
     * ==================================
     * 2. FAIL TEST (INVALID INPUT EXPECTED TO FAIL)
     * ==================================
     */
    register_fail_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 2 },
        { duration: '20s', target: 5 },
        { duration: '10s', target: 0 },
      ],
      exec: 'registerFailTest',
    },
    
  },
};

/**
 * ==================================
 * 1. PASS TEST - VALID REGISTER FLOW
 * ==================================
 */
export function registerPassTest() {
  const payload = {
    email: `user_${Date.now()}_${__VU}@gmail.com`,
    password: 'ValidPassword123!',
  };

  const res = http.post(`${BASE_URL}/api/register`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Type': 'pass',
    },
  });

  const ok = check(res, {
    'PASS: status is 200/201': (r) => r.status === 200 || r.status === 201,
  });

  if (!ok) {
    console.error(`PASS TEST FAILED | status=${res.status} | VU=${__VU}`);
  } else {
    console.log(`PASS TEST OK | status=${res.status} | VU=${__VU}`);
  }

  sleep(1);
}

/**
 * ==================================
 * 2. FAIL TEST - INVALID INPUT EXPECTED TO FAIL
 * ==================================
 */
export function registerFailTest() {
  // intentionally invalid payloads
  const invalidPayloads = [
    { email: '', password: '123' },                 // empty email
    { email: 'invalid-email', password: '123' },    // bad format
    { email: `user_${Date.now()}@gmail.com`, password: '' }, // empty password
  ];

  const payload = invalidPayloads[Math.floor(Math.random() * invalidPayloads.length)];

  const res = http.post(`${BASE_URL}/api/register`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Type': 'fail',
    },
  });

  /**
   * We EXPECT failure here:
   * - 400 Bad Request
   * - 422 Validation Error
   */
  const expectedFail = check(res, {
    'FAIL TEST: should reject input': (r) =>
      r.status === 400 || r.status === 422 || r.status === 409,
  });

  if (!expectedFail) {
    console.error(
      `❌ FAIL TEST UNEXPECTED BEHAVIOR | status=${res.status} | VU=${__VU}`
    );
    fail(`Server did not reject invalid input properly`);
  } else {
    console.log(`FAIL TEST OK (rejected correctly) | status=${res.status}`);
  }

  sleep(1);
}