// *********************
// Role of the component: Showing products on the shop page with applied filter and sort
// Name of the component: Products.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <Products params={params} searchParams={searchParams} />
// Input parameters: { params, searchParams }: { params: { slug?: string[] }, searchParams: { [key: string]: string | string[] | undefined } }
// Output: products grid
// *********************
"use client";

import React, { useEffect, useState } from "react";
import ProductItem from "./ProductItem";
import PaginationSetter from "./PaginationSetter";
import { useParams, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api";
import { Loader } from "./Loader";

const Products = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);

      const inStockNum = searchParams.get("inStock") === "true" ? 1 : 0;
      const outOfStockNum = searchParams.get("outOfStock") === "true" ? 1 : 0;
      const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
      const price = searchParams.get("price") || 3000;
      const rating = Number(searchParams.get("rating")) || 0;
      const sort = searchParams.get("sort");
      const slug = params?.slug;

      let stockMode: string = "lte";
    
      if (inStockNum === 1) stockMode = "equals";
      if (outOfStockNum === 1) stockMode = "lt";
      if (inStockNum === 1 && outOfStockNum === 1) stockMode = "lte";
      if (inStockNum === 0 && outOfStockNum === 0) stockMode = "gt";

      try {
        const data = await apiClient.get(
          `/api/products?filters[price][$lte]=${price}&filters[rating][$gte]=${rating}&filters[inStock][$${stockMode}]=1&${
            Array.isArray(slug) && slug.length > 0
              ? `filters[category][$equals]=${slug}&`
              : ""
          }sort=${sort}&page=${page}`
        );

        if (!data.ok) {
          console.error("Failed to fetch products:", data.statusText);
        } else {
          const result = await data.json();
          if (result && typeof result === "object" && "products" in result) {
            setProducts(Array.isArray(result.products) ? result.products : []);
            setTotalPages(Math.max(1, Math.ceil(result.total / result.pageSize)));
          } else {
            setProducts(Array.isArray(result) ? result : []);
          }
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [searchParams, params]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <PaginationSetter totalPages={totalPages} />
      <div className="grid grid-cols-3 justify-items-center gap-x-2 gap-y-5 max-[1300px]:grid-cols-3 max-lg:grid-cols-2 max-[500px]:grid-cols-1">
        {products.length > 0 ? (
          products.map((product: any) => (
            <ProductItem key={product.id} product={product} color="black" />
          ))
        ) : (
          <h3 className="text-3xl mt-5 text-center w-full col-span-full max-[1000px]:text-2xl max-[500px]:text-lg">
            No products found for specified query
          </h3>
        )}
      </div>
    </>
  );
};

export default Products;
