/**
 * Unofficial LaunchDarkly SDK for Electron Applications
 *
 * Client-side SDK optimized for Electron renderer process using browser APIs.
 * Provides feature flag evaluation, real-time updates, and observability support.
 */

import { LDClientImpl, AutoEnvAttributes } from '@launchdarkly/js-client-sdk-common';
import type { LDClient, LDContext, Hook, LDPluginEnvironmentMetadata } from '@launchdarkly/js-client-sdk-common';
import { createPlatform } from './platform';
import { createStreamingDataManager } from './data-manager';
import type { LDOptions } from './types';

export type { LDOptions } from './types';
export type { LDClient, LDContext } from '@launchdarkly/js-client-sdk-common';

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
export function init(
  environmentId: string,
  context: LDContext,
  options?: LDOptions,
): LDClient {
  const platform = createPlatform(options);

  // Use custom data manager factory if provided, otherwise use default streaming
  const dataManagerFactory = (options as any)?.dataManagerFactory || createStreamingDataManager;

  // Extract plugins from options
  const plugins = (options as any)?.plugins || [];

  // Create getImplementationHooks function for plugin registration
  const getImplementationHooks = (environmentMetadata: LDPluginEnvironmentMetadata): Hook[] => {
    const hooks: Hook[] = [];

    // Register each plugin and collect its hooks
    plugins.forEach((plugin: any) => {
      try {
        // Call plugin.register() to initialize it
        if (plugin.register) {
          plugin.register(undefined, environmentMetadata);
        }

        // Get hooks from plugin
        if (plugin.getHooks) {
          const pluginHooks = plugin.getHooks();
          if (Array.isArray(pluginHooks)) {
            hooks.push(...pluginHooks);
          }
        }
      } catch (error) {
        console.error(`Error registering plugin: ${error}`);
      }
    });

    return hooks;
  };

  const client = new LDClientImpl(
    environmentId,
    AutoEnvAttributes.Enabled,
    platform,
    {
      credentialType: 'clientSideId',
      ...(options as any),
    } as any,
    dataManagerFactory,
    {
      getImplementationHooks,
      credentialType: 'clientSideId',
    },
  );

  return client;
}

/**
 * Export platform for advanced use cases
 */
export { createPlatform } from './platform';
