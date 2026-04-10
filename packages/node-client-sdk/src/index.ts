import { LDClientImpl, AutoEnvAttributes } from '@launchdarkly/js-client-sdk-common';
import type { LDClient, LDContext, Hook, LDPluginEnvironmentMetadata } from '@launchdarkly/js-client-sdk-common';
import { createPlatform } from './platform';
import { createStreamingDataManager } from './data-manager';
import type { LDOptions } from './types';

export type { LDOptions, TLSOptions } from './types';
export type { LDClient, LDContext } from '@launchdarkly/js-client-sdk-common';

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
export function init(
  clientSideId: string,
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
          plugin.register(undefined, environmentMetadata); // undefined for client initially
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
    clientSideId,
    AutoEnvAttributes.Enabled,
    platform,
    {
      credentialType: 'clientSideId',
      ...options,
    },
    dataManagerFactory,
    {
      getImplementationHooks,
      credentialType: 'clientSideId',
    },
  );

  // Set the initial context after client creation
  (client as any).identify?.(context);

  return client;
}
