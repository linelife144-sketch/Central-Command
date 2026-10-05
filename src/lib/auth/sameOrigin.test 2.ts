// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertSameOrigin } from './serverPermissions';
describe('same-origin requests behind Next dev canonical URLs', () => {
  it('accepts the actual browser Host, including loopback aliases and ports', () => {
    for (const host of ['localhost:3000', '127.0.0.1:3000', 'localhost:3001']) expect(() => assertSameOrigin(new Request('http://localhost:3000/api/auth/setup-account', { headers: { host, origin: `http://${host}` } }))).not.toThrow();
  });
  it('rejects different hosts, ports, schemes and malformed origins', () => {
    for (const origin of ['http://untrusted.example','http://localhost:3001','https://localhost:3000','null']) expect(() => assertSameOrigin(new Request('http://localhost:3000/api/auth/setup-account', { headers: { host: 'localhost:3000', origin } }))).toThrow('Cross-origin request rejected.');
  });
});
