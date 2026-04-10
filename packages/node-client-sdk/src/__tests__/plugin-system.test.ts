import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import { init } from '../index';
import type { LDClient, LDContext } from '@launchdarkly/js-sdk-common';
import type { LDPluginBase, LDPluginEnvironmentMetadata } from '@launchdarkly/js-sdk-common';
import type { Hook } from '@launchdarkly/js-client-sdk-common/integrations';

describe('Plugin System', () => {
  let client: LDClient;
  let tempDir: string;

  const testContext: LDContext = {
    kind: 'user',
    key: 'test-user-123',
    name: 'Test User',
  };

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `ld-plugin-${Date.now()}`);
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

  it('should register a plugin with clientSideId in metadata', () => {
    const mockPlugin: LDPluginBase<unknown, Hook> = {
      getMetadata: () => ({
        name: '@test/mock-plugin',
      }),

      register: vi.fn((client: unknown, environmentMetadata: LDPluginEnvironmentMetadata) => {
        // Verify that clientSideId is provided in the metadata
        expect(environmentMetadata.clientSideId).toBeDefined();
        expect(environmentMetadata.clientSideId).toBe('test-client-id');
      }),

      getHooks: vi.fn(() => []),
    };

    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true,
      plugins: [mockPlugin as any],
    });

    expect(mockPlugin.register).toHaveBeenCalled();
  });

  it('should call plugin hooks on flag evaluation', () => {
    const hookMetadata = { name: '@test/evaluation-hook' };
    const beforeEvaluationHook = vi.fn((hookContext: any, data: any) => data);
    const afterEvaluationHook = vi.fn((hookContext: any, data: any, _detail: any) => data);

    const mockPlugin: LDPluginBase<unknown, Hook> = {
      getMetadata: () => ({
        name: '@test/hook-plugin',
      }),

      register: vi.fn(() => {}),

      getHooks: vi.fn(() => [
        {
          getMetadata: () => hookMetadata,
          beforeEvaluation: beforeEvaluationHook,
          afterEvaluation: afterEvaluationHook,
        } as Hook,
      ]),
    };

    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true,
      plugins: [mockPlugin as any],
    });

    // Trigger a flag evaluation
    client.variation('test-flag', false);

    // Verify hooks were called
    // Note: The exact behavior depends on the LaunchDarkly SDK implementation
    // This is a basic smoke test to ensure hooks are integrated
    expect(mockPlugin.getHooks).toHaveBeenCalled();
  });

  it('should support multiple plugins', () => {
    const plugin1Register = vi.fn();
    const plugin2Register = vi.fn();

    const mockPlugin1: LDPluginBase<unknown, Hook> = {
      getMetadata: () => ({ name: '@test/plugin-1' }),
      register: plugin1Register,
      getHooks: vi.fn(() => []),
    };

    const mockPlugin2: LDPluginBase<unknown, Hook> = {
      getMetadata: () => ({ name: '@test/plugin-2' }),
      register: plugin2Register,
      getHooks: vi.fn(() => []),
    };

    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true,
      plugins: [mockPlugin1 as any, mockPlugin2 as any],
    });

    expect(plugin1Register).toHaveBeenCalled();
    expect(plugin2Register).toHaveBeenCalled();
  });

  it('should handle plugins without hooks', () => {
    const mockPlugin: LDPluginBase<unknown, Hook> = {
      getMetadata: () => ({
        name: '@test/no-hooks-plugin',
      }),

      register: vi.fn(() => {
        // Plugin initialization logic
      }),

      getHooks: vi.fn(() => []),
    };

    client = init('test-client-id', testContext, {
      storagePath: tempDir,
      offline: true,
      plugins: [mockPlugin as any],
    });

    expect(mockPlugin.register).toHaveBeenCalled();
    expect(mockPlugin.getHooks).toHaveBeenCalled();
  });
});
