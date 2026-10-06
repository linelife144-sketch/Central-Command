import { expect, it } from 'vitest';
import { POST } from './route';
it('disables invitation sends for stale clients', async () => { expect((await POST()).status).toBe(410); });
