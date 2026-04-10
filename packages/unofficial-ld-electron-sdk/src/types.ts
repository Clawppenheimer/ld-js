/**
 * Type definitions for the Electron SDK
 */

import type { LDOptions as BaseLDOptions } from '@launchdarkly/js-client-sdk-common';

/**
 * Configuration options for the Electron SDK
 */
export interface LDOptions extends BaseLDOptions {
  /**
   * Custom localStorage implementation (if needed)
   * Defaults to browser's localStorage
   */
  storage?: Storage;

  /**
   * Whether to use secure flag for cookies (if applicable)
   * @default true
   */
  secure?: boolean;

  /**
   * Custom logger implementation
   */
  logger?: {
    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
}

/**
 * Storage interface
 */
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}
