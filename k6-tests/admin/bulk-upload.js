import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3000';
const API_UPLOAD = 'http://localhost:3001/api/bulk-upload';

/**
 * =====================================
 * LOGGING HELPERS
 * =====================================
 */
function logInfo(p, m, e = '') {
  console.log(`[${p}] ${m}${e ? ' | ' + e : ''}`);
}
function logSuccess(p, m, e = '') {
  console.log(`[${p}] ${m}${e ? ' | ' + e : ''}`);
}
function logWarn(p, m, e = '') {
  console.warn(`[${p}] ${m}${e ? ' | ' + e : ''}`);
}
function logError(p, m, e = '') {
  console.error(`[${p}] ${m}${e ? ' | ' + e : ''}`);
}

/**
 * =====================================
 * CONFIG
 * =====================================
 */
export const options = {
  thresholds: {
    http_req_failed: ['rate<0.10'],

    'http_req_duration{scenario:bulk-pass}': ['p(95)<5000'],
    'http_req_duration{scenario:bulk-stress}': ['p(95)<12000'],
  },

  scenarios: {
    bulk_pass_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '20s', target: 5 },
        { duration: '40s', target: 10 },
        { duration: '20s', target: 0 },
      ],
      exec: 'bulkPassTest',
    },

    bulk_stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 25 },
        { duration: '30s', target: 0 },
      ],
      exec: 'bulkStressTest',
    },

    invalid_test: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 5,
      exec: 'invalidTest',
    },
  },
};

/**
 * =====================================
 * CSV GENERATORS
 * Each request gets a FRESH STRING
 * =====================================
 */
function generateSmallCsv() {
  return `title,price,manufacturer,inStock,mainImage,description,slug,categoryId
Product A,99.99,Demo,10,https://example.com/a.jpg,Desc A,product-a,123e4567-e89b-12d3-a456-426614174000
Product B,149.99,Demo,5,https://example.com/b.jpg,Desc B,product-b,123e4567-e89b-12d3-a456-426614174000`;
}

function generateLargeCsv(rows = 50) {
  let csv =
    `title,price,manufacturer,inStock,mainImage,description,slug,categoryId\n`;

  for (let i = 0; i < rows; i++) {
    csv += `Product ${i},${10 + i},Brand${i},${i},https://example.com/${i}.jpg,Desc ${i},product-${i},123e4567-e89b-12d3-a456-426614174000\n`;
  }

  return csv;
}

function generateInvalidCsv() {
  return `title,price
Bad Product,abc
Broken Product,NaN`;
}

/**
 * =====================================
 * STEP 1: CSRF
 * =====================================
 */
function getCsrfToken() {
  const res = http.get(`${BASE_URL}/api/auth/csrf`);

  check(res, {
    'CSRF OK': (r) => r.status === 200,
  });

  return JSON.parse(res.body).csrfToken;
}

/**
 * =====================================
 * STEP 2: LOGIN
 * =====================================
 */
function login() {
  const csrf = getCsrfToken();
  if (!csrf) return null;

  const payload =
    `csrfToken=${encodeURIComponent(csrf)}` +
    `&email=${encodeURIComponent('natasha123@gmail.com')}` +
    `&password=${encodeURIComponent('admin1234')}` +
    `&callbackUrl=${encodeURIComponent(BASE_URL + '/admin')}`;

  const res = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    payload,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirects: 0,
    }
  );

  check(res, {
    'LOGIN 302': (r) => r.status === 302,
  });

  return res;
}

/**
 * =====================================
 * STEP 3: COOKIE
 * =====================================
 */
function getCookie(res) {
  return res?.headers['Set-Cookie'] || '';
}

/**
 * =====================================
 * STEP 4: SAFE UPLOAD FUNCTION
 * =====================================
 */
function uploadCsv(cookie, csv, scenario) {
  const file = http.file(
    csv,                      // fresh string per call
    `bulk-${Date.now()}.csv`,
    'text/csv'
  );

  const res = http.post(
    API_UPLOAD,
    { file },
    {
      headers: {
        Cookie: cookie || '',
      },
      tags: { scenario },
      timeout: '60s',
    }
  );

  return res;
}

/**
 * =====================================
 * SETUP
 * =====================================
 */
export function setup() {
  logInfo('SETUP', 'Authenticating admin...');

  const loginRes = login();
  const cookie = getCookie(loginRes);

  if (!cookie) {
    logError('SETUP', 'No session cookie obtained');
  } else {
    logSuccess('SETUP', 'Admin authenticated');
  }

  return { cookie };
}

/**
 * =====================================
 * PASS TEST
 * =====================================
 */
export function bulkPassTest(data) {
  const csv = generateSmallCsv();

  const res = uploadCsv(data.cookie, csv, 'bulk-pass');

  const ok = check(res, {
    'UPLOAD OK': (r) => r.status === 200 || r.status === 201,
    'HAS BODY': (r) => r.body && r.body.length > 0,
  });

  if (!ok) {
    logError('PASS', 'Upload failed', `status=${res.status}`);
  } else {
    logSuccess('PASS', 'Upload success', `status=${res.status}`);
  }

  sleep(1);
}

/**
 * =====================================
 * STRESS TEST
 * =====================================
 */
export function bulkStressTest(data) {
  const csv =
    Math.random() > 0.8
      ? generateInvalidCsv()
      : generateLargeCsv(100);

  const res = uploadCsv(data.cookie, csv, 'bulk-stress');

  check(res, {
    'NO 5XX': (r) => r.status < 500,
  });

  if (res.status >= 500) {
    logError('STRESS', 'Server crash', `status=${res.status}`);
  } else {
    logSuccess('STRESS', 'Upload stable', `status=${res.status}`);
  }

  sleep(0.5);
}

/**
 * =====================================
 * INVALID TEST
 * =====================================
 */
export function invalidTest(data) {
  const csv = generateInvalidCsv();

  const res = uploadCsv(data.cookie, csv, 'invalid');

  check(res, {
    'REJECT INVALID CSV': (r) =>
      r.status === 400 ||
      r.status === 422,
  });

  logInfo('INVALID', 'Validation test', `status=${res.status}`);
}