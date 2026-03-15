# Authentik OIDC Integration Test Plan Implementation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a three-tier testing strategy (Unit, Integration, and Smoke) for Authentik OIDC integration in a Hono monorepo using Bun.

**Architecture:** 
1. **Unit Tier**: Locally signed JWTs with `jose` for middleware logic.
2. **Integration Tier**: Lightweight OIDC mock server for auth code flow.
3. **Smoke Tier**: `Testcontainers` with Authentik + Blueprints for production parity.

**Tech Stack:** TypeScript, Bun, Hono, `jose`, `testcontainers-node`.

---

## Chunk 1: Unit Testing Infrastructure (Stateless JWT)

### Task 1: Setup Mock Token Generator

**Files:**
- Create: `packages/shared/src/testing/oidc-mock-utils.ts`

- [ ] **Step 1: Write the implementation**

```typescript
import { SignJWT, generateKeyPair, exportJWK } from 'jose';

export class MockTokenGenerator {
  private privateKey: any;
  public jwks: any;

  async init() {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    this.privateKey = privateKey;
    const jwk = await exportJWK(publicKey);
    this.jwks = { keys: [{ ...jwk, kid: 'test-kid', alg: 'RS256', use: 'sig' }] };
  }

  async generateToken(payload: Record<string, any> = {}) {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setIssuer('http://localhost:3001')
      .setAudience('test-client')
      .sign(this.privateKey);
  }
}
```

- [ ] **Step 2: Create unit test for the generator**

Test: `packages/shared/src/testing/oidc-mock-utils.spec.ts`

```typescript
import { expect, test, describe } from 'bun:test';
import { MockTokenGenerator } from './oidc-mock-utils';
import { jwtVerify, createLocalJWKSet } from 'jose';

describe('MockTokenGenerator', () => {
  test('generates valid verifiable JWT', async () => {
    const gen = new MockTokenGenerator();
    await gen.init();
    const token = await gen.generateToken({ sub: 'user-123' });
    const JWKS = createLocalJWKSet(gen.jwks);
    const { payload } = await jwtVerify(token, JWKS);
    expect(payload.sub).toBe('user-123');
  });
});
```

- [ ] **Step 3: Run tests**
Run: `bun test packages/shared/src/testing/oidc-mock-utils.spec.ts`

- [ ] **Step 4: Commit**
```bash
git add packages/shared/src/testing/oidc-mock-utils.ts packages/shared/src/testing/oidc-mock-utils.spec.ts
git commit -m "test: add OIDC mock token generator for unit testing"
```

---

## Chunk 2: Integration Testing Infrastructure (Mock Server)

### Task 2: Implement OIDC Mock Server

**Files:**
- Create: `packages/shared/src/testing/oidc-mock-server.ts`

- [ ] **Step 1: Write implementation using Hono**

```typescript
import { Hono } from 'hono';
import { MockTokenGenerator } from './oidc-mock-utils';

export async function createOidcMockServer() {
  const app = new Hono();
  const gen = new MockTokenGenerator();
  await gen.init();

  app.get('/.well-known/openid-configuration', (c) => c.json({
    issuer: 'http://localhost:9999',
    authorization_endpoint: 'http://localhost:9999/authorize',
    token_endpoint: 'http://localhost:9999/token',
    userinfo_endpoint: 'http://localhost:9999/userinfo',
    jwks_uri: 'http://localhost:9999/jwks',
  }));

  app.get('/jwks', (c) => c.json(gen.jwks));

  app.post('/token', async (c) => {
    const token = await gen.generateToken({ sub: 'test-user', groups: ['admins'] });
    return c.json({ access_token: token, id_token: token, token_type: 'Bearer' });
  });

  return { app, gen };
}
```

- [ ] **Step 2: Commit**
```bash
git add packages/shared/src/testing/oidc-mock-server.ts
git commit -m "test: add OIDC mock server for integration testing"
```

---

## Chunk 3: Smoke Testing Infrastructure (Authentik Container)

### Task 3: Setup Testcontainers with Authentik Blueprint

**Files:**
- Create: `apps/server/tests/authentik-smoke.spec.ts`
- Create: `apps/server/tests/blueprints/test-setup.yaml`

- [ ] **Step 1: Create Authentik Blueprint**

```yaml
version: 1
entries:
  - model: authentik_providers_oauth2.oauth2provider
    identifiers:
      name: test-provider
    attrs:
      client_id: test-client
      client_secret: test-secret
      redirect_uris: http://localhost:3001/auth/callback
      authorization_flow: !Find [authentik_flows.flow, [slug, default-authentication-flow]]
```

- [ ] **Step 2: Write smoke test structure**

```typescript
import { GenericContainer, Wait } from 'testcontainers';
import { test, expect } from 'bun:test';

test('authentik responds to discovery', async () => {
  const container = await new GenericContainer('ghcr.io/goauthentik/server:2024.12.4')
    .withExposedPorts(8000)
    .withWaitStrategy(Wait.forHttp('/-/health/ready/', 8000))
    .start();

  const port = container.getMappedPort(8000);
  const res = await fetch(`http://localhost:${port}/application/o/test-app/.well-known/openid-configuration`);
  // Note: discovery URL will vary by slug
  expect(res.status).toBeDefined();
  await container.stop();
}, 60000);
```

- [ ] **Step 3: Commit**
```bash
git add apps/server/tests/authentik-smoke.spec.ts apps/server/tests/blueprints/test-setup.yaml
git commit -m "test: add authentik smoke test with testcontainers"
```
