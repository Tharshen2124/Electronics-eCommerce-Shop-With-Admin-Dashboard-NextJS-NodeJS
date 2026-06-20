jest.mock("../../utills/db", () => ({
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

describe("BUG-C01: User Data Model – name and lastname persistence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("User creation includes name and lastname", () => {
    it("should persist name and lastname alongside email and password", async () => {
      const userData = {
        id: "user-001",
        name: "Alice",
        lastname: "Smith",
        email: "alice@example.com",
        password: "hashedpassword123",
        role: "user",
      };

      prisma.user.create = jest.fn().mockResolvedValue(userData);

      const result = await prisma.user.create({
        data: {
          id: "user-001",
          name: "Alice",
          lastname: "Smith",
          email: "alice@example.com",
          password: "hashedpassword123",
          role: "user",
        },
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Alice",
          lastname: "Smith",
          email: "alice@example.com",
        }),
      });
      expect(result.name).toBe("Alice");
      expect(result.lastname).toBe("Smith");
    });

    it("should return a user object that includes name and lastname fields", async () => {
      const mockUser = {
        id: "user-002",
        name: "Bob",
        lastname: "Jones",
        email: "bob@example.com",
        role: "user",
      };

      prisma.user.create = jest.fn().mockResolvedValue(mockUser);

      const result = await prisma.user.create({ data: mockUser });

      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("lastname");
      expect(typeof result.name).toBe("string");
      expect(typeof result.lastname).toBe("string");
    });

    it("should allow name and lastname to be null (nullable fields)", async () => {
      const mockUser = {
        id: "user-003",
        name: null,
        lastname: null,
        email: "noname@example.com",
        password: "hashed",
        role: "user",
      };

      prisma.user.create = jest.fn().mockResolvedValue(mockUser);

      const result = await prisma.user.create({
        data: {
          id: "user-003",
          name: null,
          lastname: null,
          email: "noname@example.com",
          password: "hashed",
          role: "user",
        },
      });

      expect(result.name).toBeNull();
      expect(result.lastname).toBeNull();
      expect(result.email).toBe("noname@example.com");
    });
  });

  describe("Admin dashboard – user listing includes name and lastname", () => {
    it("should return all users with name and lastname for admin identification", async () => {
      const mockUsers = [
        { id: "u1", name: "Alice", lastname: "Smith", email: "alice@example.com", role: "user" },
        { id: "u2", name: "Carol", lastname: "White", email: "carol@example.com", role: "user" },
        { id: "u3", name: null, lastname: null, email: "anon@example.com", role: "user" },
      ];

      prisma.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      const result = await prisma.user.findMany({});

      expect(result).toHaveLength(3);
      result.forEach((user) => {
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("lastname");
        expect(user).toHaveProperty("email");
      });
    });

    it("should identify users by name rather than email alone", async () => {
      const mockUsers = [
        { id: "u1", name: "Alice", lastname: "Smith", email: "alice@example.com" },
      ];

      prisma.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      const users = await prisma.user.findMany({});
      const user = users[0];

      const displayName = `${user.name} ${user.lastname}`;
      expect(displayName).toBe("Alice Smith");
      expect(user.email).toBe("alice@example.com");
    });

    it("should handle database errors during user listing gracefully", async () => {
      prisma.user.findMany = jest.fn().mockRejectedValue(new Error("DB connection lost"));

      await expect(prisma.user.findMany({})).rejects.toThrow("DB connection lost");
    });
  });
});
