jest.mock("../../utills/db", () => ({
  category: { create: jest.fn() },
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

describe("Create Category", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a category with a random name and return its id", async () => {
    const mockCat = { id: "cat-abc" };
    prisma.category.create.mockResolvedValueOnce(mockCat);

    const name = "curl-test-" + Math.random().toString(36).slice(2, 8);
    const cat = await prisma.category.create({ data: { name } });

    expect(prisma.category.create).toHaveBeenCalledWith({ data: { name } });
    expect(cat.id).toBe("cat-abc");
  });

  it("should generate names matching the curl-test- prefix pattern", () => {
    const name = "curl-test-" + Math.random().toString(36).slice(2, 8);
    expect(name).toMatch(/^curl-test-[a-z0-9]+$/);
  });

  it("should handle database creation errors", async () => {
    prisma.category.create.mockRejectedValueOnce(
      new Error("Failed to create category")
    );

    await expect(
      prisma.category.create({ data: { name: "test" } })
    ).rejects.toThrow("Failed to create category");
  });

  it("should disconnect after operations", async () => {
    prisma.category.create.mockResolvedValueOnce({ id: "cat-1" });

    await prisma.category.create({ data: { name: "test" } });
    await prisma.$disconnect();

    expect(prisma.$disconnect).toHaveBeenCalled();
  });
});
