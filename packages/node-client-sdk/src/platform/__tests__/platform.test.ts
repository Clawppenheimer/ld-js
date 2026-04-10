import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { NodePlatform } from '../index';

describe('NodePlatform', () => {
  let platform: NodePlatform;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for storage tests
    tempDir = path.join(os.tmpdir(), `ld-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    platform = new NodePlatform({
      storagePath: tempDir,
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('httpAllowsPost', () => {
    it('should always return true for Node.js', () => {
      expect(platform.httpAllowsPost()).toBe(true);
    });
  });

  describe('getCurrentUrl', () => {
    it('should return undefined (no URL in Node)', () => {
      expect(platform.getCurrentUrl()).toBeUndefined();
    });
  });

  describe('isDoNotTrack', () => {
    it('should return false', () => {
      expect(platform.isDoNotTrack()).toBe(false);
    });
  });

  describe('localStorage', () => {
    it('should store and retrieve data', async () => {
      const key = 'test-key';
      const value = '{"flag": "test-value"}';

      await platform.localStorage.set(key, value);
      const retrieved = await platform.localStorage.get(key);

      expect(retrieved).toBe(value);
    });

    it('should return null for non-existent keys', async () => {
      const retrieved = await platform.localStorage.get('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('should handle special characters in keys', async () => {
      const key = 'test:key/with.special-chars';
      const value = 'test-value';

      await platform.localStorage.set(key, value);
      const retrieved = await platform.localStorage.get(key);

      expect(retrieved).toBe(value);
    });

    it('should clear all stored data', async () => {
      await platform.localStorage.set('key1', 'value1');
      await platform.localStorage.set('key2', 'value2');

      await platform.localStorage.clear();

      const retrieved1 = await platform.localStorage.get('key1');
      const retrieved2 = await platform.localStorage.get('key2');

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
    });

    it('should handle concurrent writes', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        platform.localStorage.set(`key-${i}`, `value-${i}`),
      );

      await Promise.all(promises);

      for (let i = 0; i < 10; i++) {
        const value = await platform.localStorage.get(`key-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });
  });

  describe('eventSourceFactory', () => {
    it('should create an EventSource instance', () => {
      const url = 'https://example.com/events';
      const es = platform.eventSourceFactory(url);

      expect(es).toBeDefined();
      expect(es).toHaveProperty('addEventListener');
      expect(es).toHaveProperty('close');
    });

    it('should accept headers in options', () => {
      const url = 'https://example.com/events';
      const headers = { 'Authorization': 'Bearer token' };
      const es = platform.eventSourceFactory(url, { headers });

      expect(es).toBeDefined();
    });
  });

  describe('eventSourceIsActive', () => {
    it('should return true when EventSource is OPEN', () => {
      const mockES: any = {
        readyState: 1, // OPEN
      };
      expect(platform.eventSourceIsActive(mockES)).toBe(true);
    });

    it('should return true when EventSource is CONNECTING', () => {
      const mockES: any = {
        readyState: 0, // CONNECTING
      };
      expect(platform.eventSourceIsActive(mockES)).toBe(true);
    });

    it('should return false when EventSource is CLOSED', () => {
      const mockES: any = {
        readyState: 2, // CLOSED
      };
      expect(platform.eventSourceIsActive(mockES)).toBe(false);
    });
  });

  describe('eventSourceAllowsReport', () => {
    it('should return true', () => {
      expect(platform.eventSourceAllowsReport()).toBe(true);
    });
  });

  describe('info', () => {
    it('should return correct SDK data', () => {
      const sdkData = platform.info.sdkData();

      expect(sdkData.name).toBe('ld-node-client-sdk');
      expect(sdkData.version).toBeDefined();
      expect(sdkData.userAgentBase).toBe('NodeClientSDK');
    });

    it('should return correct platform data', () => {
      const platformData = platform.info.platformData();

      expect(platformData.name).toBe('Node');
      expect(platformData.nodeVersion).toBeDefined();
      expect(platformData.osArch).toBeDefined();
      expect(platformData.osName).toBeDefined();
    });
  });
});
