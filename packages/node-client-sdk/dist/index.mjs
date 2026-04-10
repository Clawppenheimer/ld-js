var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/index.ts
import { LDClientImpl, AutoEnvAttributes } from "@launchdarkly/js-client-sdk-common";

// src/platform/index.ts
import * as http from "http";
import * as https from "https";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
var packageJson = {
  name: "ld-node-client-sdk",
  version: "0.1.0"
};
var NodeHasher = class {
  constructor(algorithm) {
    this.hash = crypto.createHash(algorithm);
  }
  update(data) {
    this.hash.update(data);
    return this;
  }
  digest(encoding = "hex") {
    return this.hash.digest(encoding);
  }
  async asyncDigest(encoding = "hex") {
    return this.digest(encoding);
  }
};
var NodeHmac = class {
  constructor(algorithm, key) {
    this.hmac = crypto.createHmac(algorithm, key);
  }
  update(data) {
    this.hmac.update(data);
    return this;
  }
  digest(encoding = "hex") {
    return this.hmac.digest(encoding);
  }
};
var NodePlatform = class {
  constructor(options) {
    this.encoding = {
      btoa: (data) => {
        return Buffer.from(data, "utf-8").toString("base64");
      }
    };
    this.crypto = {
      createHash: (algorithm) => {
        return new NodeHasher(algorithm);
      },
      createHmac: (algorithm, key) => {
        return new NodeHmac(algorithm, key);
      },
      randomUUID: () => {
        return crypto.randomUUID();
      }
    };
    this.httpRequest = (method, url, headers, body) => {
      return new Promise((resolve, reject) => {
        try {
          const parsedUrl = new URL(url);
          const isHttps = parsedUrl.protocol === "https:";
          const protocol = isHttps ? https : http;
          const requestOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method,
            headers: {
              "User-Agent": `ld-node-client-sdk/${packageJson.version}`,
              ...headers
            }
          };
          if (isHttps && this.tlsOptions) {
            Object.assign(requestOptions, {
              ca: this.tlsOptions.ca,
              cert: this.tlsOptions.cert,
              key: this.tlsOptions.key,
              rejectUnauthorized: this.tlsOptions.rejectUnauthorized ?? true
            });
          }
          const req = protocol.request(requestOptions, (res) => {
            let data = "";
            res.on("data", (chunk) => {
              data += chunk;
            });
            res.on("end", () => {
              const responseHeaders = {};
              if (res.headers) {
                Object.entries(res.headers).forEach(([key, value]) => {
                  responseHeaders[key] = Array.isArray(value) ? value[0] : value || "";
                });
              }
              resolve({
                status: res.statusCode || 500,
                statusText: res.statusMessage || "Unknown",
                headers: responseHeaders,
                body: data
              });
            });
          });
          req.on("error", (err) => {
            this.logger?.error(`HTTP request failed: ${err.message}`);
            reject(err);
          });
          if (body) {
            const bodyStr = typeof body === "string" ? body : Buffer.from(body).toString();
            req.write(bodyStr);
          }
          req.end();
        } catch (err) {
          this.logger?.error(`HTTP request error: ${String(err)}`);
          reject(err);
        }
      });
    };
    this.httpAllowsPost = () => {
      return true;
    };
    this.getCurrentUrl = () => {
      return void 0;
    };
    this.isDoNotTrack = () => {
      return false;
    };
    this.localStorage = {
      get: async (key) => {
        try {
          const filePath = path.join(this.storagePath, `${this.sanitizeFilename(key)}.json`);
          const data = await fs.readFile(filePath, "utf-8");
          return data;
        } catch (err) {
          if (err?.code === "ENOENT") {
            return null;
          }
          this.logger?.warn(`Failed to read cache for key ${key}: ${String(err)}`);
          return null;
        }
      },
      set: async (key, value) => {
        try {
          await fs.mkdir(this.storagePath, { recursive: true });
          const filePath = path.join(this.storagePath, `${this.sanitizeFilename(key)}.json`);
          await fs.writeFile(filePath, value, "utf-8");
        } catch (err) {
          this.logger?.warn(`Failed to write cache for key ${key}: ${String(err)}`);
        }
      },
      clear: async () => {
        try {
          await fs.rm(this.storagePath, { recursive: true, force: true });
        } catch (err) {
          this.logger?.warn(`Failed to clear cache: ${String(err)}`);
        }
      }
    };
    this.eventSourceFactory = (url, options) => {
      const EventSourceClass = global.EventSource || __require("eventsource").EventSource;
      return new EventSourceClass(url, {
        headers: options?.headers
      });
    };
    this.eventSourceIsActive = (eventSource) => {
      return eventSource.readyState === 0 || eventSource.readyState === 1;
    };
    this.eventSourceAllowsReport = () => {
      return true;
    };
    this.info = {
      sdkData: () => ({
        name: "ld-node-client-sdk",
        version: packageJson.version,
        userAgentBase: "NodeClientSDK"
      }),
      platformData: () => ({
        name: "Node",
        nodeVersion: process.versions.node,
        osArch: os.arch(),
        osName: os.platform()
      })
    };
    this.storagePath = options?.storagePath || path.join(os.homedir(), ".launchdarkly");
    this.tlsOptions = options?.tlsParams;
    this.logger = options?.logger || {
      debug: () => {
      },
      info: () => {
      },
      warn: () => {
      },
      error: () => {
      }
    };
  }
  async getEventSourceClass() {
    if (!this.eventSourceClass) {
      try {
        if (global.EventSource) {
          this.eventSourceClass = global.EventSource;
        } else {
          const eventsource = await import("eventsource");
          this.eventSourceClass = eventsource.EventSource;
        }
      } catch (err) {
        this.logger?.error(`Failed to load EventSource: ${String(err)}`);
        throw err;
      }
    }
    return this.eventSourceClass;
  }
  sanitizeFilename(key) {
    return key.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 255);
  }
};
function createPlatform(options) {
  return new NodePlatform(options);
}

// src/data-manager.ts
import { BaseDataManager } from "@launchdarkly/js-client-sdk-common";
var StreamingDataManager = class extends BaseDataManager {
  constructor(platform2, flagManager, credential, config, baseHeaders, emitter, diagnosticsManager) {
    super(
      platform2,
      flagManager,
      credential,
      config,
      () => ({ pollingPath: "/sdk/latest-all" }),
      () => ({ streamingPath: "/meval" }),
      baseHeaders,
      emitter,
      diagnosticsManager
    );
  }
  async identify(identifyResolve, identifyReject, context, identifyOptions) {
    try {
      identifyResolve();
    } catch (error) {
      identifyReject(error instanceof Error ? error : new Error(String(error)));
    }
  }
};
var createStreamingDataManager = (flagManager, config, baseHeaders, emitter, diagnosticsManager) => {
  const platform2 = config.platform || {};
  const credential = config.credential || "";
  return new StreamingDataManager(
    platform2,
    flagManager,
    credential,
    config,
    baseHeaders,
    emitter,
    diagnosticsManager
  );
};

// src/index.ts
function init(clientSideId, context, options) {
  const platform2 = createPlatform(options);
  const dataManagerFactory = options?.dataManagerFactory || createStreamingDataManager;
  const client = new LDClientImpl(
    clientSideId,
    AutoEnvAttributes.Enabled,
    platform2,
    {
      credentialType: "clientSideId",
      ...options
    },
    dataManagerFactory
  );
  client.identify?.(context);
  return client;
}
export {
  init
};
//# sourceMappingURL=index.mjs.map