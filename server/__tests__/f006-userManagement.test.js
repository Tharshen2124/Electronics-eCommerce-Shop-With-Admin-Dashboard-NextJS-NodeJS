/**
 * F006 — Admin User Management
 *
 * Unit tests covering user creation validation (DT) and create/update user
 * workflows (UC).
 *
 * Source files under test:
 *   - controllers/users.js   → createUser, updateUser handlers
 *   - utills/validation.js   → validatePassword
 */

// ---------------------------------------------------------------------------
// Mock Prisma & bcrypt
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
const { createUser, updateUser } = require('../controllers/users');

// ---------------------------------------------------------------------------
// Helpers
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

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// ---------------------------------------------------------------------------
// F006 Tests
// ---------------------------------------------------------------------------
describe('F006 - Admin User Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Decision Table — User Creation Validation
  // =========================================================================
  describe('Decision Table - User Creation Validation', () => {
    // TC-06-DT-001: All fields valid → create user successfully
    test('creates user with valid email, password, and role', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'valid@test.com',
        role: 'user',
      });

      const req = mockReq({
        email: 'valid@test.com',
        password: 'SecurePass1!',
        role: 'user',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'valid@test.com',
          role: 'user',
        })
      );
    });

    // TC-06-DT-002: Missing required fields → display missing fields error
    test('rejects user creation with missing email and password', async () => {
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

    // TC-06-DT-003: Invalid email format → display invalid email error
    test('rejects user creation with invalid email format', async () => {
      const req = mockReq({
        email: 'not-valid-email',
        password: 'SecurePass1!',
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

    // TC-06-DT-004: Duplicate email → display duplicate email error
    test('rejects user creation with duplicate email (P2002)', async () => {
      const prismaError = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      prismaError.meta = { target: ['email'] };
      prisma.user.create.mockRejectedValue(prismaError);

      const req = mockReq({
        email: 'admin@gmail.com',
        password: 'SecurePass1!',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(409);
    });

    // TC-06-DT-005: Password too short → display password length error
    test('rejects user creation with password shorter than 8 characters', async () => {
      const req = mockReq({
        email: 'test@test.com',
        password: 'Short1!',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('8 characters'),
        })
      );
    });
  });

  // =========================================================================
  // Use Case — Create User Workflows
  // =========================================================================
  describe('Use Case - Create User Workflows', () => {
    // TC-06-UC-001: Main Flow – Create new user with role "user"
    test('creates user with email="newuser@test.com", password="SecurePass1!", role="user"', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'user-new',
        email: 'newuser@test.com',
        role: 'user',
      });

      const req = mockReq({
        email: 'newuser@test.com',
        password: 'SecurePass1!',
        role: 'user',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@test.com',
          role: 'user',
        })
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass1!', 14);
    });

    // TC-06-UC-002: Alternate Flow 1 – Create new user with role "admin"
    test('creates user with email="newadmin@test.com", password="SecurePass1!", role="admin"', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'user-admin',
        email: 'newadmin@test.com',
        role: 'admin',
      });

      const req = mockReq({
        email: 'newadmin@test.com',
        password: 'SecurePass1!',
        role: 'admin',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' })
      );
    });

    // TC-06-UC-003: Alternate Flow 2 – Empty required fields on user creation
    test('rejects creation with email="" and password=""', async () => {
      const req = mockReq({ email: '', password: '' });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
    });

    // TC-06-UC-004: Alternate Flow 3 – Duplicate email on user creation
    test('rejects creation with existing email "admin@gmail.com"', async () => {
      const prismaError = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      prismaError.meta = { target: ['email'] };
      prisma.user.create.mockRejectedValue(prismaError);

      const req = mockReq({
        email: 'admin@gmail.com',
        password: 'SecurePass1!',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(409);
    });

    // TC-06-UC-005: Alternate Flow 4 – Invalid email format on user creation
    test('rejects creation with malformed email', async () => {
      const req = mockReq({
        email: 'invalid-format',
        password: 'SecurePass1!',
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

    // TC-06-UC-006: Alternate Flow 5 – Password too short (3 chars) on user creation
    test('rejects creation with password="123"', async () => {
      const req = mockReq({
        email: 'test@test.com',
        password: '123',
      });
      const res = mockRes();

      createUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('8 characters'),
        })
      );
    });
  });

  // =========================================================================
  // Use Case — Update User Workflows
  // =========================================================================
  describe('Use Case - Update User Workflows', () => {
    // TC-06-UC-007: Main Flow – Update user email and password successfully
    test('updates user email and password with valid data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'old@test.com',
        password: '$2a$14$oldhash',
        role: 'user',
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'new@test.com',
        role: 'user',
      });

      const req = mockReq(
        { email: 'new@test.com', password: 'NewSecure1!' },
        { id: 'user-1' }
      );
      const res = mockRes();

      updateUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(bcrypt.hash).toHaveBeenCalledWith('NewSecure1!', 14);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ email: 'new@test.com' }),
        })
      );
    });

    // TC-06-UC-010: Alternate Flow 3 – Invalid email format on user update
    test('rejects update with invalid email format', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'existing@test.com',
        role: 'user',
      });

      const req = mockReq(
        { email: 'not-an-email' },
        { id: 'user-1' }
      );
      const res = mockRes();

      updateUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid email'),
        })
      );
    });

    // TC-06-UC-011: Alternate Flow 4 – Duplicate email on user update
    test('rejects update with duplicate email (P2002)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'existing@test.com',
        role: 'user',
      });
      const prismaError = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      prismaError.meta = { target: ['email'] };
      prisma.user.update.mockRejectedValue(prismaError);

      const req = mockReq(
        { email: 'taken@test.com' },
        { id: 'user-1' }
      );
      const res = mockRes();

      updateUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(409);
    });

    // TC-06-UC-012: Alternate Flow 5 – Password too short on user update
    test('rejects update with password shorter than 8 characters', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'existing@test.com',
        role: 'user',
      });

      const req = mockReq(
        { password: 'Short1' },
        { id: 'user-1' }
      );
      const res = mockRes();

      updateUser(req, res, jest.fn());
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('8 characters'),
        })
      );
    });

    // TC-06-UC-013: Alternate Flow 6 – Empty email field on user update
    test('handles update with empty email field', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'existing@test.com',
        password: '$2a$14$oldhash',
        role: 'user',
      });
      // When email is empty string (falsy), updateUser skips the email update
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'existing@test.com',
        role: 'user',
      });

      const req = mockReq(
        { email: '' },
        { id: 'user-1' }
      );
      const res = mockRes();

      updateUser(req, res, jest.fn());
      await flushPromises();

      // Empty email is falsy, so updateData.email is not set — update proceeds
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
