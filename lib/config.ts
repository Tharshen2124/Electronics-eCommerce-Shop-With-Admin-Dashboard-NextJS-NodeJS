const isServer = typeof window === 'undefined';

const config = {
  // Server-side uses BACKEND_INTERNAL_URL (Docker service name) so SSR can reach the backend
  // container-to-container. Browser uses NEXT_PUBLIC_API_BASE_URL (mapped host port).
  apiBaseUrl: isServer
    ? (process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001')
    : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'),
  nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
};

export default config;
