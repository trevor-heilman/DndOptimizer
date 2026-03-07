/**
 * MSW mock server setup for Node/jsdom environment.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
