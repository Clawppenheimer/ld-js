import { LDOptions as LDOptions$1, LDContext, LDClient } from '@launchdarkly/js-client-sdk-common';
export { LDClient, LDContext } from '@launchdarkly/js-client-sdk-common';
import { Platform } from '@launchdarkly/js-sdk-common';

/**
 * Type definitions for the Electron SDK
 */

/**
 * Configuration options for the Electron SDK
 */
interface LDOptions extends LDOptions$1 {
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
interface Storage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}

/**
 * Electron Platform Implementation
 *
 * Implements the Platform interface for Electron renderer process.
 * Uses browser-native APIs (Fetch, Crypto, localStorage) for maximum compatibility
 * with Electron's sandbox environment.
 */

/**
 * Create a Platform implementation for Electron renderer process
 */
declare function createPlatform(options?: LDOptions): Platform;

/**
 * Unofficial LaunchDarkly SDK for Electron Applications
 *
 * Client-side SDK optimized for Electron renderer process using browser APIs.
 * Provides feature flag evaluation, real-time updates, and observability support.
 */

/**
 * Initialize a LaunchDarkly client for Electron applications
 *
 * @param environmentId - Your LaunchDarkly environment ID (client-side)
 * @param context - The user context
 * @param options - Optional configuration
 * @returns An initialized LDClient instance
 *
 * @example
 * ```typescript
 * import { init } from 'unofficial-ld-electron-sdk';
 *
 * const client = init('environment-id', {
 *   kind: 'user',
 *   key: 'user-123',
 *   name: 'John Doe',
 * });
 *
 * await client.waitForInitialization();
 * const showFeature = client.variation('my-flag', false);
 * await client.close();
 * ```
 */
declare function init(environmentId: string, context: LDContext, options?: LDOptions): LDClient;

export { type LDOptions, createPlatform, init };
