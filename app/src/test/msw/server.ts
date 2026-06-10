import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW node server for unit/integration tests. Lifecycle is wired in test/setup.ts. */
export const mswServer = setupServer(...handlers);
