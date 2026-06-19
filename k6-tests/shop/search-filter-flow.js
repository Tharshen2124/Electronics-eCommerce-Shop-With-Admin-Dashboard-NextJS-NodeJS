import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3000';

export const options = {
  /**
   * ==================================
   * REQ_NFP02 (concurrent users support)
   * ==================================
   */
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 30 },
    { duration: '1m', target: 50 },   // moderate load
    { duration: '30s', target: 0 },
  ],

  /**
   * ==================================
   * NFR THRESHOLDS 
   * ==================================
   */
  thresholds: {
    // REQ_NFP01: response time SLA
    http_req_duration: [
      'avg<3000',
      'p(95)<5000', // adjusted realistic shop threshold
    ],

    // REQ_NFR02: reliability
    http_req_failed: ['rate<0.01'], // <1% failure allowed
  },
};

const SEARCH_TERMS = ['phone', 'watch', 'camera', 'smart', 'gimbal'];

function log(level, message) {
  console.log(`[${level}] ${new Date().toISOString()} | ${message}`);
}

export default function () {

  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const flow = Math.random();

  log('INFO', `VU=${__VU} ITER=${__ITER}`);

  /**
   * =========================
   * 1. SEARCH FLOW
   * =========================
   * REQ_NFP01 + REQ_NFU02
   */
  if (flow < 0.4) {

    const res = http.get(`${BASE_URL}/shop?search=${term}`);

    const ok = check(res, {
      'REQ_NFP01 search reachable': (r) => r.status === 200,
      'REQ_NFS03 no server crash': (r) => r.status !== 500,
      'REQ_NFU02 fast UX response': (r) => r.timings.duration < 5000,
    });

    log(ok ? 'PASS' : 'FAIL',
      `SEARCH | ${term} | ${res.status} | ${res.timings.duration.toFixed(2)}ms`
    );

    sleep(1);
    return;
  }

  /**
   * =========================
   * 2. FILTER FLOW
   * =========================
   * REQ_NFP01 + REQ_NFS03
   */
  if (flow < 0.7) {

    const res = http.get(`${BASE_URL}/shop?inStock=true&rating=4&sort=ratingDesc`);

    const ok = check(res, {
      'REQ_NFP01 filter OK': (r) => r.status === 200,
      'REQ_NFS03 safe query execution': (r) => r.status !== 500,
      'REQ_NFU02 responsive filter': (r) => r.timings.duration < 5000,
    });

    log(ok ? 'PASS' : 'FAIL',
      `FILTER | ${res.status} | ${res.timings.duration.toFixed(2)}ms`
    );

    sleep(1);
    return;
  }

  /**
   * =========================
   * 3. COMBINED FLOW
   * =========================
   * REQ_NFP02 (complex query load)
   */
  if (flow < 0.9) {

    const res = http.get(
      `${BASE_URL}/shop?search=${term}&inStock=true&sort=defaultSort`
    );

    const ok = check(res, {
      'REQ_NFP02 combined stability': (r) => r.status === 200,
      'REQ_NFS03 no DB crash': (r) => r.status !== 500,
      'REQ_NFU02 acceptable UX latency': (r) => r.timings.duration < 6000,
    });

    log(ok ? 'PASS' : 'FAIL',
      `COMBINED | ${term} | ${res.status} | ${res.timings.duration.toFixed(2)}ms`
    );

    sleep(1);
    return;
  }

  /**
   * =========================
   * 4. PRODUCT FLOW
   * =========================
   * REQ_NFP01 + REQ_NFP02 (deep navigation)
   */
  const shop = http.get(`${BASE_URL}/shop`);

  const slug = extractSlug(shop.body) || 'smart-phone-demo';

  const product = http.get(`${BASE_URL}/product/${slug}`);

  const ok = check(product, {
    'REQ_NFP01 product reachable': (r) => r.status === 200,
    'REQ_NFS03 safe product query': (r) => r.status !== 500,
    'REQ_NFU02 product UX speed': (r) => r.timings.duration < 5000,
  });

  log(ok ? 'PASS' : 'FAIL',
    `PRODUCT | ${slug} | ${product.status} | ${product.timings.duration.toFixed(2)}ms`
  );

  sleep(1);
}

function extractSlug(html) {
  if (!html) return null;
  const match = html.match(/\/product\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}