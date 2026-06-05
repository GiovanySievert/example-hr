import type { RequestHandler } from 'msw';

import { hcmHandlers } from './hcm';

export const handlers: RequestHandler[] = [...hcmHandlers];
