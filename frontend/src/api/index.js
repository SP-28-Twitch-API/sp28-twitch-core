import { realApi } from './real';
import { mockApi } from './mock';

// demo mode: `npm run dev:mock`, or the "Try the demo" button on the login page
const DEMO_KEY = 'sp28.demo';
const forcedMock = import.meta.env.MODE === 'mock'; // set by `npm run dev:mock` (vite --mode mock)

export const isDemo = () => {
  if (forcedMock) return true;
  try { return sessionStorage.getItem(DEMO_KEY) === '1'; } catch { return false; }
};

export const startDemo = () => { try { sessionStorage.setItem(DEMO_KEY, '1'); } catch { /* ignore */ } };
export const endDemo = () => { try { sessionStorage.removeItem(DEMO_KEY); } catch { /* ignore */ } };

export const api = () => (isDemo() ? mockApi : realApi);
export { ApiError } from './errors';