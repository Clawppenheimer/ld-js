import * as http from 'node:http';
import * as https from 'node:https';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import type { Platform, Info } from '@launchdarkly/js-sdk-common';
import type { LDOptions, TLSOptions } from '../types';

const packageJson = {
  name: 'ld-node-client-sdk',
  version: '0.1.0',
};

interface PlatformRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | Uint8Array;
}

interface PlatformResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * Node.js implementation of a cryptographic hasher
 */
class NodeHasher {
  private hash: crypto.Hash;

  constructor(algorithm: string) {
    this.hash = crypto.createHash(algorithm);
  }

  update(data: string): this {
    this.hash.update(data);
    return this;
  }

  digest(encoding: BufferEncoding = 'hex'): string {
    return this.hash.digest(encoding);
  }

  async asyncDigest(encoding: BufferEncoding = 'hex'): Promise<string> {
    return this.digest(encoding);
  }
}

/**
 * Node.js implementation of HMAC
 */
class NodeHmac {
  private hmac: crypto.Hmac;

  constructor(algorithm: string, key: string) {
    this.hmac = crypto.createHmac(algorithm, key);
  }

  update(data: string): this {
    this.hmac.update(data);
    return this;
  }

  digest(encoding: BufferEncoding = 'hex'): string {
    return this.hmac.digest(encoding);
  }
}

/**
 * Node.js Platform implementation for LaunchDarkly client-side SDK
 */
export class NodePlatform implements Platform {
  private storagePath: string;
  private tlsOptions?: TLSOptions;
  private logger: LDOptions['logger'];
  private eventSourceClass?: any;

  constructor(options?: LDOptions) {
    this.storagePath = options?.storagePath || path.join(os.homedir(), '.launchdarkly');
    this.tlsOptions = options?.tlsParams;
    this.logger = options?.logger || {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
  }

  private async getEventSourceClass(): Promise<any> {
    if (!this.eventSourceClass) {
      try {
        // Try to use the global mock first (for testing)
        if ((global as any).EventSource) {
          this.eventSourceClass = (global as any).EventSource;
        } else {
          // Otherwise import eventsource
          const eventsource = await import('eventsource');
          this.eventSourceClass = eventsource.EventSource;
        }
      } catch (err) {
        this.logger?.error(`Failed to load EventSource: ${String(err)}`);
        throw err;
      }
    }
    return this.eventSourceClass;
  }

  readonly encoding = {
    btoa: (data: string): string => {
      return Buffer.from(data, 'utf-8').toString('base64');
    },
  };

  readonly crypto = {
    createHash: (algorithm: string) => {
      return new NodeHasher(algorithm);
    },
    createHmac: (algorithm: string, key: string) => {
      return new NodeHmac(algorithm, key);
    },
    randomUUID: (): string => {
      return crypto.randomUUID();
    },
  };

  readonly httpRequest = (
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: string | ArrayBuffer | Uint8Array,
  ): Promise<PlatformResponse> => {
    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const protocol = isHttps ? https : http;

        const requestOptions: http.RequestOptions | https.RequestOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method,
          headers: {
            'User-Agent': `ld-node-client-sdk/${packageJson.version}`,
            ...headers,
          },
        };

        if (isHttps && this.tlsOptions) {
          Object.assign(requestOptions, {
            ca: this.tlsOptions.ca,
            cert: this.tlsOptions.cert,
            key: this.tlsOptions.key,
            rejectUnauthorized: this.tlsOptions.rejectUnauthorized ?? true,
          });
        }

        const req = protocol.request(requestOptions, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            const responseHeaders: Record<string, string> = {};
            if (res.headers) {
              Object.entries(res.headers).forEach(([key, value]) => {
                responseHeaders[key] = Array.isArray(value) ? value[0] : (value || '');
              });
            }

            resolve({
              status: res.statusCode || 500,
              statusText: res.statusMessage || 'Unknown',
              headers: responseHeaders,
              body: data,
            });
          });
        });

        req.on('error', (err) => {
          this.logger?.error(`HTTP request failed: ${err.message}`);
          reject(err);
        });

        if (body) {
          const bodyStr = typeof body === 'string' ? body : Buffer.from(body).toString();
          req.write(bodyStr);
        }

        req.end();
      } catch (err) {
        this.logger?.error(`HTTP request error: ${String(err)}`);
        reject(err);
      }
    });
  };

  readonly httpAllowsPost = (): boolean => {
    return true;
  };

  readonly getCurrentUrl = (): string | undefined => {
    return undefined;
  };

  readonly isDoNotTrack = (): boolean => {
    return false;
  };

  readonly localStorage = {
    get: async (key: string): Promise<string | null> => {
      try {
        const filePath = path.join(this.storagePath, `${this.sanitizeFilename(key)}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        return data;
      } catch (err) {
        if ((err as any)?.code === 'ENOENT') {
          return null;
        }
        this.logger?.warn(`Failed to read cache for key ${key}: ${String(err)}`);
        return null;
      }
    },

    set: async (key: string, value: string): Promise<void> => {
      try {
        await fs.mkdir(this.storagePath, { recursive: true });
        const filePath = path.join(this.storagePath, `${this.sanitizeFilename(key)}.json`);
        await fs.writeFile(filePath, value, 'utf-8');
      } catch (err) {
        this.logger?.warn(`Failed to write cache for key ${key}: ${String(err)}`);
      }
    },

    clear: async (): Promise<void> => {
      try {
        await fs.rm(this.storagePath, { recursive: true, force: true });
      } catch (err) {
        this.logger?.warn(`Failed to clear cache: ${String(err)}`);
      }
    },
  };

  readonly eventSourceFactory = (
    url: string,
    options?: {
      headers?: Record<string, string>;
      errorFilter?: (err: Error) => boolean;
    },
  ) => {
    // Use global EventSource if available (for testing), otherwise import
    const EventSourceClass = (global as any).EventSource || require('eventsource').EventSource;
    return new EventSourceClass(url, {
      headers: options?.headers,
    });
  };

  readonly eventSourceIsActive = (eventSource: any): boolean => {
    return (eventSource.readyState === 0 || eventSource.readyState === 1);
  };

  readonly eventSourceAllowsReport = (): boolean => {
    return true;
  };

  readonly info: Info = {
    sdkData: () => ({
      name: 'ld-node-client-sdk',
      version: packageJson.version,
      userAgentBase: 'NodeClientSDK',
    }),

    platformData: () => ({
      name: 'Node',
      nodeVersion: process.versions.node,
      osArch: os.arch(),
      osName: os.platform(),
    }),
  };

  private sanitizeFilename(key: string): string {
    return key
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);
  }
}

export function createPlatform(options?: LDOptions): Platform {
  return new NodePlatform(options);
}
