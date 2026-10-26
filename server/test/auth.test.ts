// Integration tests for authentication. They run against the REAL database, so run
// `npm run db:migrate && npm run db:seed` first. Run with: npm test
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";

// Must be set before the app is imported (env is read at import time).
process.env.LOGIN_RATE_LIMIT_MAX = "1000";
const { createApp } = await import("../src/app");
const { env } = await import("../src/config/env");
const { pool, query } = await import("../src/lib/db");
const { errorHandler } = await import("../src/middleware/errorHandler");
const { requireAuth, requireRole } = await import("../src/middleware/auth");

const PASSWORD = "password123";
const STUDENT = "andrea.santos@g.msuiit.edu.ph";
const ADVISER = "ramon.flores@msuiit.edu.ph";

let base = "";
let server: ReturnType<ReturnType<typeof createApp>["listen"]>;

const call = (path: string, init: { method?: string; body?: unknown; token?: string; raw?: string } = {}) =>
  fetch(base + path, {
    method: init.method ?? (init.body || init.raw ? "POST" : "GET"),
    headers: {
      ...(init.body || init.raw ? { "Content-Type": "application/json" } : {}),
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.raw ?? (init.body ? JSON.stringify(init.body) : undefined),
  });
const loginAs = async (email: string, password = PASSWORD) => call("/api/auth/login", { body: { email, password } });

before(async () => {
  const seeded = await query("SELECT 1 FROM users WHERE email = $1", [STUDENT]);
  assert.ok(seeded.rowCount, "Database isn't seeded. Run: npm run db:migrate && npm run db:seed");
  server = createApp().listen(0);
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});
after(async () => { server.close(); await pool.end(); });

describe("POST /api/auth/login", () => {
  it("logs in with correct credentials and never leaks the password hash", async () => {
    const res = await loginAs(STUDENT);
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.email, STUDENT);
    assert.equal(body.user.role, "student");
    assert.equal(body.user.position, null);
    assert.equal(JSON.stringify(body).includes("password"), false);
    assert.equal(JSON.stringify(body).includes("$2"), false); // no bcrypt hash anywhere
  });

  it("returns the approver's position", async () => {
    const body: any = await (await loginAs(ADVISER)).json();
    assert.equal(body.user.role, "approver");
    assert.equal(body.user.position, "Adviser");
  });

  it("treats email case-insensitively", async () => {
    assert.equal((await loginAs("Andrea.Santos@G.MSUIIT.edu.ph")).status, 200);
  });

  it("rejects a wrong password and an unknown email with the SAME message", async () => {
    const wrong = await loginAs(STUDENT, "nope");
    const unknown = await loginAs("nobody@msuiit.edu.ph");
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(await wrong.json(), await unknown.json());
  });

  it("rejects missing or malformed input with 400", async () => {
    assert.equal((await call("/api/auth/login", { body: { email: STUDENT } })).status, 400);
    assert.equal((await call("/api/auth/login", { body: { email: "not-an-email", password: "x" } })).status, 400);
    assert.equal((await call("/api/auth/login", { raw: "{bad json" })).status, 400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns the current user for a valid token", async () => {
    const { token }: any = await (await loginAs(STUDENT)).json();
    const res = await call("/api/auth/me", { token });
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as any).user.email, STUDENT);
  });

  it("rejects no token, garbage, a forged token, and an expired token", async () => {
    assert.equal((await call("/api/auth/me")).status, 401);
    assert.equal((await call("/api/auth/me", { token: "garbage" })).status, 401);

    const { rows } = await query("SELECT id FROM users WHERE email = $1", [STUDENT]);
    const forged = jwt.sign({}, "some-other-secret-that-is-at-least-32-chars!", { subject: rows[0].id });
    assert.equal((await call("/api/auth/me", { token: forged })).status, 401);

    const expired = jwt.sign({}, env.JWT_SECRET, { subject: rows[0].id, expiresIn: -10 });
    assert.equal((await call("/api/auth/me", { token: expired })).status, 401);
  });

  it("stops working immediately if the user is deleted", async () => {
    const hash = await bcrypt.hash(PASSWORD, 4);
    await query("INSERT INTO users (email, password_hash, name, role) VALUES ('temp.student@test.local', $1, 'Temp', 'student')", [hash]);
    try {
      const { token }: any = await (await loginAs("temp.student@test.local")).json();
      assert.equal((await call("/api/auth/me", { token })).status, 200);
      await query("DELETE FROM users WHERE email = 'temp.student@test.local'");
      assert.equal((await call("/api/auth/me", { token })).status, 401);
    } finally {
      await query("DELETE FROM users WHERE email = 'temp.student@test.local'");
    }
  });
});

describe("requireRole", () => {
  it("lets the right role through and returns 403 for the wrong one", async () => {
    const app = express();
    app.get("/approver-only", requireAuth, requireRole("approver"), (_req, res) => { res.json({ ok: true }); });
    app.use(errorHandler);
    const s = app.listen(0);
    const url = `http://localhost:${(s.address() as AddressInfo).port}/approver-only`;
    try {
      const student: any = await (await loginAs(STUDENT)).json();
      const adviser: any = await (await loginAs(ADVISER)).json();
      assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${student.token}` } })).status, 403);
      assert.equal((await fetch(url, { headers: { Authorization: `Bearer ${adviser.token}` } })).status, 200);
      assert.equal((await fetch(url)).status, 401);
    } finally { s.close(); }
  });
});
