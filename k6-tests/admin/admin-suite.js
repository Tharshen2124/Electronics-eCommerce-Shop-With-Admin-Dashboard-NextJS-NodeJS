import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:3000';

// ==============================
// AUTH TOKENS: for easier testing, need to change
// ==============================
const CSRF_TOKEN =
    '0474dc6f4c78a27b1e2343853a6c5d30da53f50bd512dcf81509942a53b853ac%7C2b9ff5c63387a327afe5f0a063b86d32c836d88a032180ea29f4d3ec234ff866';

const SESSION_TOKEN =
    'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..cw4VsxLLJn6m5-Ma.Tw3XP7UxQ5cFy0ro2aoBipW5uGd9q3PmBahZrGvIyt89mUgMxkLY2pUo-Vvt8_C72DZZIhux48qelDi81hAYIhB_E1xyfBAwwFgUlhYcYLB-hDHP4dqfGUDdTuhOO9Phq26ltBeu7dJaEYLKjpyTuqAumvmEjbRJeKOy7b5K9Dazea_Kh0DVkwPH9mZR4MDazQ.fI5JnCwm9Ubg9reHiRgmMA';

// ==============================
// AUTH HEADERS 
// ==============================
function authHeaders() {
    return {
        headers: {
            'Content-Type': 'application/json',

            Cookie:
                `next-auth.session-token=${SESSION_TOKEN}; ` +
                `next-auth.csrf-token=${CSRF_TOKEN}`,
        },
        timeout: '30s', // helps detect real latency issues (REQ_NFP01)
    };
}

// ==============================
// TEST OPTIONS: REQ_NFP02 SCALABILITY
// ==============================
export const options = {
    scenarios: {
        bulk_pass_test: {
            executor: 'constant-vus',
            vus: 10,
            duration: '1m',
            exec: 'bulkPassTest',
        },

        bulk_stress_test: {
            executor: 'constant-vus',
            vus: 25,
            duration: '2m',
            exec: 'bulkStressTest',
        },

        crud_create_test: {
            executor: 'constant-vus',
            vus: 15, // increased for better scalability signal
            duration: '1m',
            exec: 'crudCreateTest',
        },

        crud_update_test: {
            executor: 'constant-vus',
            vus: 15,
            duration: '1m',
            exec: 'crudUpdateTest',
        },

        invalid_test: {
            executor: 'shared-iterations',
            vus: 5,
            iterations: 10,
            exec: 'invalidTest',
        },
    },

    thresholds: {
        /**
         * REQ_NFP01 - Performance SLA
         */
        http_req_duration: [
            'avg<3000',
            'p(95)<5000',
        ],

        /**
         * REQ_NFR02 - Reliability under load
         */
        http_req_failed: ['rate<0.01'],
    },
};

// ==============================
// CHECK WRAPPER
// ==============================
function validate(res, name, maxTime = 5000) {
    return check(res, {
        [`${name} - status ok`]: (r) => r.status >= 200 && r.status < 500,
        [`${name} - no server crash (REQ_NFS03)`]: (r) => r.status !== 500,
        [`${name} - UX response time (REQ_NFU02)`]: (r) => r.timings.duration < maxTime,
    });
}

// ==============================
// BULK PASS TEST (REQ_NFP01 + NFS03)
// ==============================
export function bulkPassTest() {
    const res = http.post(
        `${BASE_URL}/admin/bulk-upload`,
        JSON.stringify({ mode: 'pass' }),
        authHeaders()
    );

    console.log(`[BULK_PASS] ${res.status} | ${res.timings.duration}ms`);

    validate(res, 'bulk_pass', 5000);

    sleep(1);
}

// ==============================
// BULK STRESS TEST (REQ_NFP02)
// ==============================
export function bulkStressTest() {
    const res = http.post(
        `${BASE_URL}/admin/bulk-upload`,
        JSON.stringify({ mode: 'stress' }),
        authHeaders()
    );

    console.log(`[BULK_STRESS] ${res.status} | ${res.timings.duration}ms`);

    validate(res, 'bulk_stress', 6000);

    sleep(1);
}

// ==============================
// CREATE USER (REQ_NFP01 + NFR02)
// ==============================
export function crudCreateTest() {
    const res = http.post(
        `${BASE_URL}/admin/users`,
        JSON.stringify({
            email: `user_${Date.now()}@test.com`,
            password: 'Test1234!',
        }),
        authHeaders()
    );

    console.log(`[CREATE_USER] ${res.status} | ${res.timings.duration}ms`);

    validate(res, 'create_user', 5000);

    sleep(1);
}

// ==============================
// UPDATE PRODUCT (REQ_NFS03 VALIDATION)
// ==============================
export function crudUpdateTest() {
    const res = http.put(
        `${BASE_URL}/admin/products/1`,
        JSON.stringify({ name: 'Updated Product' }),
        authHeaders()
    );

    console.log(`[UPDATE_PRODUCT] ${res.status} | ${res.timings.duration}ms`);

    validate(res, 'update_product', 5000);

    sleep(1);
}

// ==============================
// INVALID TEST (ROBUSTNESS CHECK)
// ==============================
export function invalidTest() {
    const res = http.post(
        `${BASE_URL}/admin/users`,
        JSON.stringify({}),
        authHeaders()
    );

    console.log(`[INVALID_TEST] ${res.status} | ${res.timings.duration}ms`);

    check(res, {
        'invalid handled properly (REQ_NFS03)': (r) => r.status >= 400,
        'no server crash': (r) => r.status !== 500,
    });

    sleep(1);
}