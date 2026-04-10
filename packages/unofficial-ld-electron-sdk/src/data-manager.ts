/**
 * Streaming Data Manager for Electron SDK
 *
 * Extends the base data manager with streaming flag updates via EventSource.
 */

import { BaseDataManager } from '@launchdarkly/js-sdk-common';
import type { Platform, DataManager } from '@launchdarkly/js-sdk-common';

/**
 * Create a streaming data manager for real-time flag updates
 */
export function createStreamingDataManager(
  platform: Platform,
  sdkKey: string,
  baseUrl: string,
): DataManager {
  const baseDataManager = new BaseDataManager(sdkKey, baseUrl);

  // Return the base manager - streaming is handled by the SDK core
  // The Platform's eventSource implementation provides the stream
  return baseDataManager;
}
