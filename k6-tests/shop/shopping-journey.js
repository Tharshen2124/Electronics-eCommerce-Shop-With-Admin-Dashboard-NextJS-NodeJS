import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // -----------------------------
  // REQ_NFP02: scalability (1000 users)
  // -----------------------------
  stages: [
    { duration: '1m', target: 100 },
    { duration: '2m', target: 500 },
    { duration: '2m', target: 1000 }, // REQUIRED NFR LOAD
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    // -----------------------------
    // REQ_NFP01: avg < 3s
    // -----------------------------
    http_req_duration: [
      'avg<3000',
      'p(95)<5000'
    ],

    // -----------------------------
    // REQ_NFR02: stability (uptime 99.9%)
    // allow max 0.1% failure
    // -----------------------------
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = 'http://localhost:3000';

const IN_STOCK_PRODUCTS = [
  'notebook-horizon-demo',
  'smart-watch-demo',
  'phone-gimbal-demo',
];

const OUT_OF_STOCK_PRODUCTS = [
  'smart-phone-demo',
  'slr-camera-demo',
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function () {

  // -------------------------
  // REQ_NFP01: Homepage API performance
  // -------------------------
  const homeRes = http.get(`${BASE_URL}/`);

  check(homeRes, {
    'REQ_NFP01 homepage responds': (r) => r.status === 200,
    'REQ_NFP01 homepage <3s': (r) => r.timings.duration < 3000,
  });

  sleep(1);

  // -------------------------
  // Product simulation
  // -------------------------
  const slug = Math.random() < 0.3
    ? randomItem(OUT_OF_STOCK_PRODUCTS)
    : randomItem(IN_STOCK_PRODUCTS);

  const productRes = http.get(`${BASE_URL}/product/${slug}`);

  check(productRes, {
    'valid response (REQ_NFC01 compatible)': (r) => r.status === 200 || r.status === 404,
    'no server error (REQ_NFS03)': (r) => r.status !== 500,
    'REQ_NFP01 product <3s': (r) => r.timings.duration < 3000,
  });

  sleep(1);

  // -------------------------
  // Cart performance (critical UX)
  // -------------------------
  const cartRes = http.get(`${BASE_URL}/cart`);

  check(cartRes, {
    'cart reachable': (r) => r.status === 200,
    'REQ_NFU02 responsive UI backend support <3s': (r) => r.timings.duration < 3000,
  });

  sleep(1);
}