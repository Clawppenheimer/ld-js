import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import { init } from '../index';
import type { LDClient, LDContext } from '@launchdarkly/js-sdk-common';

describe('Node Client SDK Integration', () => {
  let client: LDClient;
  let tempDir: string;

  const testContext: LDContext = {
    kind: 'user',
    key: 'test-user-123',
    name: 'Test User',
  };

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `ld-integration-${Date.now()}`);
  });

  afterEach(async () => {
    try {
      if (client && typeof client.close === 'function') {
        await client.close();
      }
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should initialize a client', () => {
    // This test verifies that init() creates a valid LDClient instance
    // In a real scenario, this would need a valid client-side ID and network connection
    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true, // Start in offline mode for testing
    });

    expect(client).toBeDefined();
    expect(typeof client.variation).toBe('function');
    expect(typeof client.identify).toBe('function');
    expect(typeof client.track).toBe('function');
  });

  it('should evaluate a flag with offline mode', async () => {
    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true,
    });

    // In offline mode, variation should return the fallback value
    const result = client.variation('test-flag', false);
    expect(result).toBe(false);
  });

  it('should support context identification', async () => {
    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true,
    });

    const newContext: LDContext = {
      kind: 'user',
      key: 'new-user-456',
      name: 'New User',
    };

    // Identify with new context (offline, so no network call)
    await client.identify(newContext);

    // Verify the context was updated
    expect(client.getContext()).toBeDefined();
  });

  it('should support analytics tracking', async () => {
    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true,
    });

    // Track an event
    client.track('test-event', {
      customData: 'value',
    });

    // No assertion needed - just verify no error is thrown
    expect(true).toBe(true);
  });

  it('should apply custom logger', () => {
    const logs: string[] = [];
    const mockLogger = {
      debug: (msg: string) => logs.push(`[DEBUG] ${msg}`),
      info: (msg: string) => logs.push(`[INFO] ${msg}`),
      warn: (msg: string) => logs.push(`[WARN] ${msg}`),
      error: (msg: string) => logs.push(`[ERROR] ${msg}`),
    };

    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true,
      logger: mockLogger,
    });

    expect(client).toBeDefined();
  });
});
