/**
 * Electron Platform Implementation
 *
 * Implements the Platform interface for Electron renderer process.
 * Uses browser-native APIs (Fetch, Crypto, localStorage) for maximum compatibility
 * with Electron's sandbox environment.
 */

import type { Platform } from '@launchdarkly/js-sdk-common';
import type { LDOptions } from '../types';

/**
 * Create a Platform implementation for Electron renderer process
 */
export function createPlatform(options?: LDOptions): Platform {
  return {
    // HTTP client using browser Fetch API
    http: {
      fetch: async (url: string, opts: RequestInit) => {
        try {
          const response = await fetch(url, opts);
          const text = await response.text();

          return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: text,
          };
        } catch (error) {
          throw new Error(`HTTP request failed: ${error}`);
        }
      },
    },

    // Crypto operations using native Web Crypto API
    crypto: {
      createHash: (algorithm: string): any => {
        // Normalize algorithm names for Web Crypto
        const cryptoAlgorithm = algorithm === 'sha256' ? 'SHA-256' : algorithm.toUpperCase();

        return {
          update: function (this: { data: string }, data: string) {
            this.data = (this.data || '') + data;
            return this;
          },
          digest: async function (this: { data: string }, encoding: 'hex' | 'base64' = 'hex') {
            const encoder = new TextEncoder();
            const data = encoder.encode(this.data);
            const hashBuffer = await crypto.subtle.digest(cryptoAlgorithm, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));

            if (encoding === 'hex') {
              return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
            } else {
              const binary = String.fromCharCode(...hashArray);
              return btoa(binary);
            }
          },
        } as any;
      },

      createHmac: (algorithm: string, key: string): any => {
        // Normalize algorithm names for Web Crypto
        const cryptoAlgorithm = algorithm === 'sha256' ? 'SHA-256' : algorithm.toUpperCase();
        const encoder = new TextEncoder();

        return {
          update: function (this: { data: string }, data: string) {
            this.data = (this.data || '') + data;
            return this;
          },
          digest: async function (this: { data: string }, encoding: 'hex' | 'base64' = 'hex') {
            try {
              const keyData = encoder.encode(key);
              const cryptoKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'HMAC', hash: cryptoAlgorithm },
                false,
                ['sign'],
              );

              const data = encoder.encode(this.data);
              const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
              const hashArray = Array.from(new Uint8Array(signature));

              if (encoding === 'hex') {
                return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
              } else {
                const binary = String.fromCharCode(...hashArray);
                return btoa(binary);
              }
            } catch (error) {
              throw new Error(`HMAC operation failed: ${error}`);
            }
          },
        } as any;
      },

      randomUUID: () => {
        return crypto.randomUUID();
      },
    } as any,

    // Storage using localStorage
    storage: {
      getItem: (key: string) => {
        try {
          return (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null) as string | null;
        } catch (error) {
          console.warn(`Failed to read from localStorage: ${error}`);
          return null;
        }
      },

      setItem: (key: string, value: string) => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
          }
        } catch (error) {
          console.warn(`Failed to write to localStorage: ${error}`);
        }
      },

      removeItem: (key: string) => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Failed to remove from localStorage: ${error}`);
        }
      },

      clear: async (key?: string) => {
        try {
          if (typeof localStorage !== 'undefined') {
            if (key) {
              localStorage.removeItem(key);
            } else {
              localStorage.clear();
            }
          }
        } catch (error) {
          console.warn(`Failed to clear localStorage: ${error}`);
        }
      },
    } as any,

    // Encoding operations
    encoding: {
      btoa: (data: string): string => {
        return btoa(data);
      },

      atob: (data: string): string => {
        return atob(data);
      },
    } as any,

    // EventSource for streaming updates
    eventSource: {
      async createEventSource(url: string): Promise<any> {
        // Check if EventSource is available in Electron
        if (typeof EventSource !== 'undefined') {
          return new EventSource(url);
        } else {
          throw new Error('EventSource is not available in this Electron environment');
        }
      },
    } as any,

    // Console logging
    logger: {
      debug: (msg: string) => console.debug(`[LD:DEBUG] ${msg}`),
      info: (msg: string) => console.info(`[LD:INFO] ${msg}`),
      warn: (msg: string) => console.warn(`[LD:WARN] ${msg}`),
      error: (msg: string) => console.error(`[LD:ERROR] ${msg}`),
    },
  } as any;
}
