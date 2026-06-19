import http from 'k6/http';

const BASE_URL = 'http://localhost:3000';


export function getAllProductsPage() {
  return http.get(`${BASE_URL}/shop`);
}


export function getFilteredProducts() {
  const query =
    'outOfStock=true&inStock=true&rating=0&price=3000&sort=defaultSort&page=1';

  return http.get(`${BASE_URL}/shop?${query}`);
}


export function getProductDetail(slug) {
  return http.get(`${BASE_URL}/product/${slug}`);
}