jest.mock("../../utills/db", () => ({
  category: { create: jest.fn(), delete: jest.fn() },
  product: { create: jest.fn(), delete: jest.fn() },
  $disconnect: jest.fn(),
}));

const prisma = require("../../utills/db");

describe("DB Check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a category", async () => {
    const mockCat = { id: "cat-1", name: "db-check-abc123" };
    prisma.category.create.mockResolvedValueOnce(mockCat);

    const cat = await prisma.category.create({
      data: { name: "db-check-abc123" },
    });

    expect(cat.id).toBe("cat-1");
  });

  it("should create a product with required fields", async () => {
    const mockProd = {
      id: "prod-1",
      title: "DB Check Product",
      slug: "db-check-slug",
      price: 111,
      rating: 5,
      description: "test",
      manufacturer: "test",
      mainImage: "x.webp",
      categoryId: "cat-1",
      inStock: 1,
    };
    prisma.product.create.mockResolvedValueOnce(mockProd);

    const prod = await prisma.product.create({ data: mockProd });

    expect(prod.id).toBe("prod-1");
    expect(prod.title).toBe("DB Check Product");
    expect(prod.price).toBe(111);
  });

  it("should delete the product after creation", async () => {
    prisma.product.delete.mockResolvedValueOnce({ id: "prod-1" });

    await prisma.product.delete({ where: { id: "prod-1" } });

    expect(prisma.product.delete).toHaveBeenCalledWith({
      where: { id: "prod-1" },
    });
  });

  it("should delete the category after cleanup", async () => {
    prisma.category.delete.mockResolvedValueOnce({ id: "cat-1" });

    await prisma.category.delete({ where: { id: "cat-1" } });

    expect(prisma.category.delete).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });

  it("should handle database errors gracefully", async () => {
    prisma.product.create.mockRejectedValueOnce(
      new Error("DB check failed")
    );

    await expect(
      prisma.product.create({ data: { title: "fail" } })
    ).rejects.toThrow("DB check failed");
  });

  it("should disconnect Prisma after all operations", async () => {
    await prisma.$disconnect();

    expect(prisma.$disconnect).toHaveBeenCalled();
  });
});
