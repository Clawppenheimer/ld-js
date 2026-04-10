import { BaseDataManager } from '@launchdarkly/js-client-sdk-common';
import type {
  DataManager,
  DataManagerFactory,
  FlagManager,
  Configuration,
  LDIdentifyOptions,
} from '@launchdarkly/js-client-sdk-common';
import type { Context, Platform, LDHeaders, internal } from '@launchdarkly/js-sdk-common';
import type LDEmitter from '@launchdarkly/js-client-sdk-common';

/**
 * Streaming DataManager for Node.js
 * Handles streaming flag updates from LaunchDarkly servers
 */
export class StreamingDataManager extends BaseDataManager implements DataManager {
  constructor(
    platform: Platform,
    flagManager: FlagManager,
    credential: string,
    config: Configuration,
    baseHeaders: LDHeaders,
    emitter: LDEmitter,
    diagnosticsManager?: internal.DiagnosticsManager,
  ) {
    super(
      platform,
      flagManager,
      credential,
      config,
      () => ({ pollingPath: '/sdk/latest-all' }),
      () => ({ streamingPath: '/meval' }),
      baseHeaders,
      emitter,
      diagnosticsManager,
    );
  }

  async identify(
    identifyResolve: () => void,
    identifyReject: (err: Error) => void,
    _context: Context,
    _identifyOptions?: LDIdentifyOptions,
  ): Promise<void> {
    // In offline mode, resolve immediately
    // In streaming mode, the base class handles streaming connection
    try {
      identifyResolve();
    } catch (error) {
      identifyReject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Factory function to create StreamingDataManager instances
 * This is the default data manager factory for the Node SDK
 */
export const createStreamingDataManager: DataManagerFactory = (
  flagManager: FlagManager,
  config: Configuration,
  baseHeaders: LDHeaders,
  emitter: LDEmitter,
  diagnosticsManager?: internal.DiagnosticsManager,
): DataManager => {
  // Extract platform and credential from config
  // These are set by LDClientImpl before calling the factory
  const platform = (config as any).platform || {};
  const credential = (config as any).credential || '';

  return new StreamingDataManager(
    platform,
    flagManager,
    credential,
    config,
    baseHeaders,
    emitter,
    diagnosticsManager,
  );
};
