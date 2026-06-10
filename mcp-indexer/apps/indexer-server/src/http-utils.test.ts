import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from './http-utils.js';

// Minimal Express stand-ins so we can exercise the handler without a server.
const fakeReq = (): Request => ({}) as Request;
const fakeRes = (): Response => ({}) as Response;

test('asyncHandler forwards a rejected promise to next(err)', async () => {
  const boom = new Error('boom');
  let forwarded: unknown;
  const next: NextFunction = (err?: unknown) => {
    forwarded = err;
  };

  const handler = asyncHandler(async () => {
    throw boom;
  });
  handler(fakeReq(), fakeRes(), next);

  // Allow the rejected promise's .catch microtask to run.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(forwarded, boom);
});

test('asyncHandler does not call next when the handler resolves', async () => {
  let called = false;
  const next: NextFunction = () => {
    called = true;
  };

  const handler = asyncHandler(async () => {
    return undefined;
  });
  handler(fakeReq(), fakeRes(), next);

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(called, false);
});

// Mirrors the validation in routes/knowledge.ts for the /chat input contract.
const MAX_QUESTION_CHARS = 4000;
const isValidQuestion = (q: unknown): boolean =>
  typeof q === 'string' && q.trim().length > 0 && q.length <= MAX_QUESTION_CHARS;

test('chat question validation rejects empty, non-string, and oversized input', () => {
  assert.equal(isValidQuestion(''), false);
  assert.equal(isValidQuestion('   '), false);
  assert.equal(isValidQuestion(undefined), false);
  assert.equal(isValidQuestion(42), false);
  assert.equal(isValidQuestion('x'.repeat(MAX_QUESTION_CHARS + 1)), false);
  assert.equal(isValidQuestion('what does GraphService do?'), true);
});
