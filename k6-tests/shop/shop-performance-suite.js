import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3000';

// Valid product slugs
const PRODUCTS = [
  'notebook-horizon-demo',
  'smart-watch-demo',
  'smart-phone-demo',
  'mixed-grinder-demo',
];

// Invalid product slugs
const INVALID_PRODUCTS = [
  'invalid-product-1',
  'does-not-exist',
  'fake-slug',
  'test-product-404',
];

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.10'],

    // Aligns with NFR and test logs
    http_req_duration: [
      'avg<3000',
      'p(95)<10000',
    ],

    // Individual test-case thresholds
    'http_req_duration{scenario:pass}': [
      'avg<3000',
      'p(95)<10000',
    ],

    'http_req_duration{scenario:fail}': [
      'avg<3000',
      'p(95)<10000',
    ],

    'http_req_duration{scenario:stress}': [
      'avg<3000',
      'p(95)<10000',
    ],
  },

  scenarios: {
    /**
     * =====================================
     * PASS TEST
     * Simulates normal browsing
     * =====================================
     */
    shop_pass_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '20s', target: 5 },
        { duration: '40s', target: 10 },
        { duration: '20s', target: 0 },
      ],
      exec: 'shopPassTest',
    },

    /**
     * =====================================
     * FAIL TEST
     * Invalid product access
     * =====================================
     */
    shop_fail_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '20s', target: 2 },
        { duration: '40s', target: 5 },
        { duration: '20s', target: 0 },
      ],
      exec: 'shopFailTest',
    },

    /**
     * =====================================
     * STRESS TEST
     * Product page scalability
     * =====================================
     */
    shop_stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      exec: 'shopStressTest',
    },
  },
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * =====================================
 * PASS TEST
 * Expected:
 * Homepage -> 200
 * Product -> 200
 * Cart -> 200
 * No HTTP 500 errors
 * =====================================
 */
export function shopPassTest() {
  const params = {
    tags: {
      scenario: 'pass',
    },
  };

  // Homepage
  const homeRes = http.get(`${BASE_URL}/`, params);

  check(homeRes, {
    'PASS: homepage reachable': (r) => r.status === 200,
    'PASS: homepage no HTTP 500': (r) => r.status < 500,
  });

  sleep(0.5);

  // Product Page
  const slug = randomItem(PRODUCTS);

  const productRes = http.get(
    `${BASE_URL}/product/${slug}`,
    params
  );

  const productOk = check(productRes, {
    'PASS: product page reachable': (r) =>
      r.status === 200,

    'PASS: product content exists': (r) =>
      r.body && r.body.length > 500,

    'PASS: product no HTTP 500': (r) =>
      r.status < 500,
  });

  sleep(0.5);

  // Cart
  const cartRes = http.get(
    `${BASE_URL}/cart`,
    params
  );

  check(cartRes, {
    'PASS: cart reachable': (r) =>
      r.status === 200,

    'PASS: cart no HTTP 500': (r) =>
      r.status < 500,
  });

  if (productOk) {
    console.log(
      `PASS TEST OK | Product=${slug} | ${productRes.timings.duration.toFixed(2)} ms`
    );
  } else {
    console.error(
      `PASS TEST FAILED | Product=${slug} | Status=${productRes.status}`
    );
  }

  sleep(Math.random() * 2 + 1);
}

/**
 * =====================================
 * FAIL TEST
 * Expected:
 * Invalid slug -> 404
 * No HTTP 500 errors
 * =====================================
 */
export function shopFailTest() {
  const invalidSlug = randomItem(
    INVALID_PRODUCTS
  );

  const params = {
    tags: {
      scenario: 'fail',
    },
  };

  const res = http.get(
    `${BASE_URL}/product/${invalidSlug}`,
    params
  );

  const expectedFail = check(res, {
    'FAIL TEST: invalid product rejected': (r) =>
      r.status === 404,

    'FAIL TEST: no HTTP 500': (r) =>
      r.status < 500,
  });

  if (expectedFail) {
    console.log(
      `FAIL TEST OK | Invalid Product=${invalidSlug}`
    );
  } else {
    console.error(
      `FAIL TEST FAILED | Expected 404 | Got ${res.status}`
    );
  }

  sleep(1);
}

/**
 * =====================================
 * STRESS TEST
 * Expected:
 * Product page remains responsive
 * under heavier load
 * No HTTP 500 errors
 * =====================================
 */
export function shopStressTest() {
  const slug = randomItem(PRODUCTS);

  const params = {
    tags: {
      scenario: 'stress',
    },
  };

  const res = http.get(
    `${BASE_URL}/product/${slug}`,
    params
  );

  check(res, {
    'STRESS: response received': (r) =>
      r.status > 0,

    'STRESS: no HTTP 500': (r) =>
      r.status < 500,
  });

  if (res.status >= 500) {
    console.error(
      `STRESS FAILURE | ${slug} | ${res.status} | ${res.timings.duration.toFixed(2)} ms`
    );
  } else {
    console.log(
      `STRESS OK | ${slug} | ${res.status} | ${res.timings.duration.toFixed(2)} ms`
    );
  }

  sleep(0.5);
}