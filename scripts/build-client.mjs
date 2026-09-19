// Client build. NODE_ENV is pinned to "production" before Vite loads any .env file, because a local
// `.env` with NODE_ENV=development (used by the API in `npm run dev`) would otherwise make Vite ship
// React's development build (+700 KB, slower, warnings not stripped).
process.env.NODE_ENV = 'production';
const { build } = await import('vite');
await build();
