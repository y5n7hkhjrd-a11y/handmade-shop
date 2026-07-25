// Vercel serverless entry point
// Exports the Express app so Vercel can serve it as a serverless function.
//
// The existing src/index.ts also calls app.listen() for local development.
// On Vercel, listen() is never invoked because this module is imported,
// not executed directly. The exported app is used by the Vercel runtime.

export { default } from '../src/index.js';
