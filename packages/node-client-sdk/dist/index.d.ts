import { LDOptions as LDOptions$1, LDPluginBase, Hook, LDContext, LDClient } from '@launchdarkly/js-client-sdk-common';
export { LDClient, LDContext } from '@launchdarkly/js-client-sdk-common';

interface TLSOptions {
    /** Path to CA certificate file */
    ca?: string;
    /** Path to client certificate file */
    cert?: string;
    /** Path to client key file */
    key?: string;
    /** Whether to reject unauthorized connections */
    rejectUnauthorized?: boolean;
}
interface LDOptions extends LDOptions$1 {
    /** Filesystem path for flag cache. Default: ~/.launchdarkly/ */
    storagePath?: string;
    /** TLS parameters for HTTPS requests */
    tlsParams?: TLSOptions;
    /** Logger for debug output */
    logger?: {
        debug(message: string, ...args: unknown[]): void;
        info(message: string, ...args: unknown[]): void;
        warn(message: string, ...args: unknown[]): void;
        error(message: string, ...args: unknown[]): void;
    };
    /** Plugins for extending SDK functionality */
    plugins?: LDPluginBase<unknown, Hook>[];
    /** Credential type for the SDK */
    credentialType?: 'clientSideId' | 'mobileKey';
}

/**
 * Initialize a LaunchDarkly client for Node.js
 *
 * @param clientSideId - Your LaunchDarkly client-side ID
 * @param context - The user context
 * @param options - Optional configuration
 * @returns An initialized LDClient instance
 *
 * @example
 * ```typescript
 * import { init } from '@unguibus/ld-node-client-sdk';
 *
 * const client = init('client-side-id', { kind: 'user', key: 'user123' });
 * await client.waitForInitialization();
 * const showFeature = client.variation('my-flag', false);
 * ```
 */
declare function init(clientSideId: string, context: LDContext, options?: LDOptions): LDClient;

export { type LDOptions, type TLSOptions, init };
