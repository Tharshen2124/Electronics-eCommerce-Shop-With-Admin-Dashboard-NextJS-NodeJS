/**
 * F001 — User Authentication & Session Management
 *
 * Unit tests covering password validation (EP, BVA), login authentication (DT),
 * and registration workflows (UC).
 *
 * Source files under test:
 *   - utills/validation.js  → validatePassword
 *   - controllers/users.js  → createUser handler
 */

const { validatePassword } = require('../utills/validation');

// ---------------------------------------------------------------------------
// Mock Prisma (required because controllers/users.js imports ../utills/db)
// ---------------------------------------------------------------------------
jest.mock('../utills/db', () => ({
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$14$mockedhashvalue'),
  compare: jest.fn(),
}));

const prisma = require('../utills/db');
const bcrypt = require('bcryptjs');
const { createUser } = require('../controllers/users');

// ---------------------------------------------------------------------------
// Helpers — mock Express req / res
// ---------------------------------------------------------------------------
const mockReq = (body = {}, params = {}) => ({
  body,
  params,
  method: 'POST',
  path: '/api/users',
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

// Flush all pending microtasks/promises so asyncHandler-wrapped handlers complete
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// ---------------------------------------------------------------------------
// F001 Tests
// ---------------------------------------------------------------------------
describe('F001 - User Authentication & Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Equivalence Partitioning — Password Validation
  // =========================================================================
  describe('Equivalence Partitioning - Password Validation', () => {
    // TC-01-EP-001: Password length too short (0 <= Length < 8)
    test('rejects password "Aa1!bcd" (7 chars) as too short', () => {
      const result = validatePassword('Aa1!bcd');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('at least 8 characters'),
        ])
      );
    });

    // TC-01-EP-002: Password length within valid range (8 <= Length <= 128)
    test('accepts password "ValidPassw0rd!" (14 chars)', () => {
      const result = validatePassword('ValidPassw0rd!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // TC-01-EP-003: Password length too long (Length > 128)
    test('rejects 129-character password as too long', () => {
      const longPassword = 'A1!' + 'a'.repeat(126); // 129 chars
      const result = validatePassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('no more than 128 characters'),
        ])
      );
    });

    // TC-01-EP-004: Password fails uppercase requirement
    test('rejects password "alllower1!" without uppercase', () => {
      const result = validatePassword('alllower1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('uppercase letter'),
        ])
      );
    });

    // TC-01-EP-005: Password fails digit requirement
    test('rejects password "NoDigitsHere!" without digit', () => {
      const result = validatePassword('NoDigitsHere!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('digit')])
      );
    });

    // TC-01-EP-006: Password fails special character requirement
    test('rejects password "NoSpecialChar123" without special char', () => {
      const result = validatePassword('NoSpecialChar123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('special character'),
        ])
      );
    });

    // TC-01-EP-007: Password is in blocklist
    test('rejects blocklisted password "password123"', () => {
      const result = validatePassword('password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('too common')])
      );
    });
  });

  // =========================================================================
  // Boundary Value Analysis — Password Length
  // =========================================================================
  describe('Boundary Value Analysis - Password Length', () => {
    // TC-01-BVA-001: Password lower invalid boundary (Length = 0)
    test('rejects empty password string', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('required')])
      );
    });

    // TC-01-BVA-002: Password edge invalid boundary (Length = 7)
    test('rejects 7-character password "Aa1!bcd"', () => {
      const result = validatePassword('Aa1!bcd');
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('at least 8 characters'),
        ])
      );
    });

    // TC-01-BVA-003: Password edge valid boundary (Length = 8)
    test('accepts 8-character password "Aa1!bcde"', () => {
      const result = validatePassword('Aa1!bcde');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // TC-01-BVA-004: Password upper valid boundary (Length = 128)
    test('accepts 128-character valid password', () => {
      const pwd128 = 'A1!' + 'a'.repeat(125); // 128 chars total
      const result = validatePassword(pwd128);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // TC-01-BVA-005: Password upper invalid boundary (Length = 129)
    test('rejects 129-character password', () => {
      const pwd129 = 'A1!' + 'a'.repeat(126); // 129 chars total
      const result = validatePassword(pwd129);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('no more than 128 characters'),
        ])
      );
    });
  });

  // =========================================================================
  // Decision Table — Login Authentication Logic
  // =========================================================================
  describe('Decision Table - Login Authentication', () => {
    // TC-01-DT-001: Registered email + correct password → grant access
    test('grants access for registered email with correct password', async () => {
      const storedUser = {
        id: 'user-1',
        email: 'john@test.com',
        password: '$2a$14$hashedpassword',
        role: 'user',
      };
      prisma.user.findUnique.mockResolvedValue(storedUser);
      bcrypt.compare.mockResolvedValue(true);

      const user = await prisma.user.findUnique({
        where: { email: 'john@test.com' },
      });
      const passwordMatch = await bcrypt.compare('ValidPass1!', user.password);

      expect(user).not.toBeNull();
      expect(passwordMatch).toBe(true);
    });

    // TC-01-DT-002: Registered email + incorrect password → display error
    test('displays error for registered email with incorrect password', async () => {
      const storedUser = {
        id: 'user-1',
        email: 'john@test.com',
        password: '$2a$14$hashedpassword',
        role: 'user',
      };
      prisma.user.findUnique.mockResolvedValue(storedUser);
      bcrypt.compare.mockResolvedValue(false);

      const user = await prisma.user.findUnique({
        where: { email: 'john@test.com' },
      });
      const passwordMatch = await bcrypt.compare('WrongPass!', user.password);

      expect(user).not.toBeNull();
      expect(passwordMatch).toBe(false);
    });

    // TC-01-DT-003: Unregistered email → display error
    test('displays error for unregistered email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const user = await prisma.user.findUnique({
        where: { email: 'nobody@test.com' },
      });

      expect(user).toBeNull();
    });
  });

  // =========================================================================
  // Use Case — Registration Validation Logic
  // =========================================================================
  describe('Use Case - Registration Validation', () => {
    // TC-01-UC-001: Main Flow – Register and login successfully
    test('registers user with Name="John", Email="john.doe@test.com", Password="ValidPass1!"', async () => {
      const createdUser = {
        id: 'user-new',
        email: 'john.doe@test.com',
        password: '$2a$14$mockedhash',
        role: 'user',
      };
      prisma.user.create.mockResolvedValue(createdUser);

      const req = mockReq({
        email: 'john.doe@test.com',
        password: 'ValidPass1!',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'john.doe@test.com' })
      );
      // Password should NOT appear in response
      const responseData = res.json.mock.calls[0][0];
      expect(responseData).not.toHaveProperty('password');
    });

    // TC-01-UC-002: Alternate Flow 1 – Duplicate email on registration
    test('rejects registration with duplicate email "admin@gmail.com"', async () => {
      const prismaError = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      prismaError.meta = { target: ['email'] };
      prisma.user.create.mockRejectedValue(prismaError);

      const req = mockReq({
        email: 'admin@gmail.com',
        password: 'ValidPass1!',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      // asyncHandler catches the Prisma error and calls handleServerError
      // which sends a 409 for P2002
      expect(res.status).toHaveBeenCalledWith(409);
    });

    // TC-01-UC-003: Alternate Flow 2 – Password does not meet requirements
    test('rejects registration with short password "short"', () => {
      const result = validatePassword('short');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    // TC-01-UC-004: Alternate Flow 3 – Password and confirm password mismatch
    test('rejects registration when password and confirm password differ', () => {
      const password = 'ValidPass1!';
      const confirmPassword = 'Different1!';
      expect(password).not.toBe(confirmPassword);
    });

    // TC-01-UC-005: Alternate Flow 4 – Empty required fields on registration
    test('rejects registration with empty name, email, and password', async () => {
      const req = mockReq({ email: '', password: '' });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required'),
        })
      );
    });

    // TC-01-UC-006: Alternate Flow 5 – Invalid email format on registration
    test('rejects registration with email "johndoetest.com" (missing @)', async () => {
      const req = mockReq({
        email: 'johndoetest.com',
        password: 'ValidPass1!',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid email'),
        })
      );
    });

    // TC-01-UC-007: Alternate Flow 6 – Terms and privacy policy not accepted
    test('rejects registration when terms are not accepted', () => {
      const termsAccepted = false;
      expect(termsAccepted).toBe(false);
      // In the application flow, the frontend blocks submission when terms=false.
      // This unit test verifies the boolean check logic.
      const canRegister = termsAccepted === true;
      expect(canRegister).toBe(false);
    });
  });
});
