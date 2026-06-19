import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3000';

/**
 * =====================================
 * LOGGING HELPERS
 * =====================================
 */
function logInfo(phase, message, extra = '') {
  console.log(`[${phase}] ${message}${extra ? ' | ' + extra : ''}`);
}

function logSuccess(phase, message, extra = '') {
  console.log(`[${phase}] ${message}${extra ? ' | ' + extra : ''}`);
}

function logWarn(phase, message, extra = '') {
  console.warn(`[${phase}] ${message}${extra ? ' | ' + extra : ''}`);
}

function logError(phase, message, extra = '') {
  console.error(`[${phase}] ${message}${extra ? ' | ' + extra : ''}`);
}

/**
 * =====================================
 * CONFIG
 * =====================================
 */
export const options = {
  thresholds: {
    'http_req_duration{scenario:admin-pass}': ['p(95)<5000'],
    'http_req_duration{scenario:admin-stress}': ['p(95)<10000'],
    http_req_failed: ['rate<0.10'],
  },

  scenarios: {
    admin_pass_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '20s', target: 5 },
        { duration: '40s', target: 10 },
        { duration: '20s', target: 0 },
      ],
      exec: 'adminPassTest',
    },

    admin_stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      exec: 'adminStressTest',
    },
  },
};

/**
 * =====================================
 * ADMIN ROUTES
 * =====================================
 */
const PAGES = [
  '/admin/products',
  '/admin/products/new',
  '/admin/categories',
  '/admin/users',
  '/admin/merchant',
];

/**
 * =====================================
 * STEP 1: GET CSRF TOKEN
 * =====================================
 */
function getCsrfToken() {
  logInfo('CSRF', 'Fetching CSRF token...');

  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/auth/csrf`);
  const ms = Date.now() - start;

  const passed = check(res, {
    'CSRF STATUS 200': (r) => r.status === 200,
  });

  if (!passed) {
    logError('CSRF', `Token fetch failed`, `status=${res.status} duration=${ms}ms`);
    return null;
  }

  if (ms > 3000) {
    logWarn('CSRF', `Slow response`, `duration=${ms}ms`);
  } else {
    logSuccess('CSRF', `Token received`, `duration=${ms}ms`);
  }

  const body = JSON.parse(res.body);
  return body.csrfToken;
}

/**
 * =====================================
 * STEP 2: LOGIN
 * =====================================
 */
function login() {
  logInfo('LOGIN', 'Attempting login...');

  const csrfToken = getCsrfToken();

  if (!csrfToken) {
    logError('LOGIN', 'Aborting — no CSRF token available');
    return null;
  }

  const payload =
    `csrfToken=${encodeURIComponent(csrfToken)}` +
    `&email=${encodeURIComponent('natasha123@gmail.com')}` +
    `&password=${encodeURIComponent('admin1234')}` +
    `&callbackUrl=${encodeURIComponent(BASE_URL + '/admin')}`;

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    payload,
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirects: 0,
    }
  );
  const ms = Date.now() - start;

  const passed = check(res, {
    'LOGIN REDIRECT 302': (r) => r.status === 302,
  });

  if (!passed) {
    logError('LOGIN', `Unexpected login response`, `status=${res.status} duration=${ms}ms`);
  } else {
    logSuccess('LOGIN', `Login redirect received`, `status=${res.status} duration=${ms}ms`);
  }

  return res;
}

/**
 * =====================================
 * STEP 3: EXTRACT COOKIE
 * =====================================
 */
function getSessionCookie(res) {
  if (!res) {
    logError('COOKIE', 'No login response to extract cookie from');
    return null;
  }

  const cookie = res.headers['Set-Cookie'];

  if (!cookie) {
    logError('COOKIE', 'No Set-Cookie header in login response');
  } else {
    logSuccess('COOKIE', 'Session cookie extracted');
  }

  return cookie;
}

/**
 * =====================================
 * STEP 4: ADMIN PAGE CHECK
 * =====================================
 */
function isAdminResponse(res) {
  const body = res.body || '';

  const isLoginPage =
    body.includes('name="csrfToken"') ||
    body.includes('/api/auth/callback/credentials') ||
    (body.toLowerCase().includes('sign in') &&
      body.toLowerCase().includes('password'));

  return res.status === 200 && !isLoginPage;
}

/**
 * =====================================
 * SETUP — runs ONCE before all scenarios
 * =====================================
 */
export function setup() {
  logInfo('SETUP', '─────────────────────────────');
  logInfo('SETUP', 'Starting global setup...');

  const loginRes = login();
  const cookie = getSessionCookie(loginRes);

  if (!cookie) {
    logError('SETUP', 'Setup failed — no session cookie. All VUs will run without auth.');
  } else {
    logSuccess('SETUP', 'Setup complete — session cookie shared with all VUs');
  }

  logInfo('SETUP', '─────────────────────────────');

  return { cookie };
}

/**
 * =====================================
 * PASS TEST
 * =====================================
 */
export function adminPassTest(data) {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];

  logInfo('PASS', `Requesting page`, `page=${page}`);

  const start = Date.now();
  const res = http.get(`${BASE_URL}${page}`, {
    headers: { Cookie: data.cookie || '' },
    tags: { scenario: 'admin-pass' },
  });
  const ms = Date.now() - start;

  const ok = check(res, {
    'STATUS 200': (r) => r.status === 200,
    'ADMIN ACCESS': (r) => isAdminResponse(r),
  });

  if (ok) {
    if (ms > 3000) {
      logWarn('PASS', `Page loaded but slow`, `page=${page} status=${res.status} duration=${ms}ms`);
    } else {
      logSuccess('PASS', `Admin page OK`, `page=${page} status=${res.status} duration=${ms}ms`);
    }
  } else {
    logError('PASS', `Auth or page check failed`, `page=${page} status=${res.status} duration=${ms}ms`);

    // Extra hint: detect if it looks like a redirect to login
    if (res.status === 302 || res.status === 301) {
      logError('PASS', `Redirect detected — session cookie may have expired`, `location=${res.headers['Location'] || 'unknown'}`);
    }

    // Partial body hint (first 120 chars) to help diagnose content issues
    const bodyHint = (res.body || '').substring(0, 120).replace(/\n/g, ' ');
    logError('PASS', `Response body hint`, `"${bodyHint}"`);
  }

  sleep(1);
}

/**
 * =====================================
 * STRESS TEST
 * =====================================
 */
export function adminStressTest(data) {
  const page = PAGES[Math.floor(Math.random() * PAGES.length)];

  logInfo('STRESS', `Requesting page`, `page=${page}`);

  const start = Date.now();
  const res = http.get(`${BASE_URL}${page}`, {
    headers: { Cookie: data.cookie || '' },
    tags: { scenario: 'admin-stress' },
  });
  const ms = Date.now() - start;

  check(res, {
    'NO SERVER ERROR': (r) => r.status < 500,
    'ADMIN PAGE OK': (r) => isAdminResponse(r),
  });

  if (res.status >= 500) {
    logError('STRESS', `Server error`, `page=${page} status=${res.status} duration=${ms}ms`);
  } else if (!isAdminResponse(res)) {
    logWarn('STRESS', `Page returned 200 but failed admin check`, `page=${page} duration=${ms}ms`);
  } else if (ms > 5000) {
    logWarn('STRESS', `Page slow under stress`, `page=${page} status=${res.status} duration=${ms}ms`);
  } else {
    logSuccess('STRESS', `Page OK`, `page=${page} status=${res.status} duration=${ms}ms`);
  }

  sleep(0.5);
}