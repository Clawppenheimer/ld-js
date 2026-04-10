import type { LDOptions as LDOptionsBase } from '@launchdarkly/js-client-sdk-common';
import type { LDPluginBase, Hook } from '@launchdarkly/js-client-sdk-common';

export interface TLSOptions {
  /** Path to CA certificate file */
  ca?: string;
  /** Path to client certificate file */
  cert?: string;
  /** Path to client key file */
  key?: string;
  /** Whether to reject unauthorized connections */
  rejectUnauthorized?: boolean;
}

export interface LDOptions extends LDOptionsBase {
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
