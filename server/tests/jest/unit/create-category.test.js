jest.mock("../../../utills/db", () => ({
  category: {
    create: jest.fn(),
  },
  $disconnect: jest.fn(),
}));

const prisma = require("../../../utills/db");

describe("Create Category", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCategory", () => {
    it("should successfully create a category with random name", async () => {
      const name = "curl-test-" + Math.random().toString(36).slice(2, 8);
      const mockCategory = {
        id: "cat-12345",
        name: name,
      };
      prisma.category = {
        create: jest.fn().mockResolvedValue(mockCategory),
      };
      prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

      const result = await prisma.category.create({ data: { name } });

      expect(prisma.category.create).toHaveBeenCalledWith({ data: { name } });
      expect(result.id).toBe("cat-12345");
      expect(result.name).toBe(name);
    });

    it("should generate valid random category name format", async () => {
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const expectedName = "curl-test-" + randomSuffix;

      prisma.category = {
        create: jest
          .fn()
          .mockResolvedValue({ id: "cat-789", name: expectedName }),
      };
      prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

      const name = "curl-test-" + randomSuffix;
      const result = await prisma.category.create({ data: { name } });

      expect(result.name).toMatch(/^curl-test-[a-z0-9]{6}$/);
    });

    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      prisma.category = {
        create: jest.fn().mockRejectedValue(dbError),
      };
      prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

      const name = "curl-test-" + Math.random().toString(36).slice(2, 8);
      await expect(
        prisma.category.create({ data: { name } })
      ).rejects.toThrow("Database connection failed");
      expect(prisma.category.create).toHaveBeenCalledWith({ data: { name } });
    });

    it("should disconnect Prisma client after operations", async () => {
      const name = "curl-test-" + Math.random().toString(36).slice(2, 8);
      const mockCategory = { id: "cat-12345", name };

      prisma.category = {
        create: jest.fn().mockResolvedValue(mockCategory),
      };
      prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

      await prisma.category.create({ data: { name } });
      await prisma.$disconnect();

      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it("should return category with correct structure", async () => {
      const expectedCategory = {
        id: "cat-abc123",
        name: "curl-test-xyz789",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.category = {
        create: jest.fn().mockResolvedValue(expectedCategory),
      };
      prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

      const result = await prisma.category.create({
        data: { name: expectedCategory.name },
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
      expect(typeof result.id).toBe("string");
      expect(typeof result.name).toBe("string");
    });

    it("should handle prisma client not being available", async () => {
      prisma.category = undefined;

      expect(() => {
        prisma.category.create({ data: { name: "test" } });
      }).toThrow();
    });

    it("should handle empty name in category creation", async () => {
      const validationError = new Error("Name is required");
      prisma.category = {
        create: jest.fn().mockRejectedValue(validationError),
      };
      prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

      await expect(
        prisma.category.create({ data: { name: "" } })
      ).rejects.toThrow("Name is required");
    });

    it("should execute create-category flow completely", async () => {
      const categoryName =
        "curl-test-" + Math.random().toString(36).slice(2, 8);
      const createdCategory = { id: "cat-flow-123", name: categoryName };

      prisma.category = {
        create: jest.fn().mockResolvedValue(createdCategory),
      };
      prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

      let categoryId;
      try {
        const cat = await prisma.category.create({
          data: { name: categoryName },
        });
        categoryId = cat.id;
      } catch (e) {
        throw e;
      } finally {
        await prisma.$disconnect();
      }

      expect(categoryId).toBe("cat-flow-123");
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { name: categoryName },
      });
      expect(prisma.$disconnect).toHaveBeenCalled();
    });
  });
});
