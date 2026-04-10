"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  init: () => init
});
module.exports = __toCommonJS(index_exports);
var import_js_client_sdk_common2 = require("@launchdarkly/js-client-sdk-common");

// src/platform/index.ts
var http = __toESM(require("http"));
var https = __toESM(require("https"));
var fs = __toESM(require("fs/promises"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var crypto = __toESM(require("crypto"));
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
      const EventSourceClass = global.EventSource || require("eventsource").EventSource;
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
var import_js_client_sdk_common = require("@launchdarkly/js-client-sdk-common");
var StreamingDataManager = class extends import_js_client_sdk_common.BaseDataManager {
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
  async identify(identifyResolve, identifyReject, _context, _identifyOptions) {
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
  const plugins = options?.plugins || [];
  const getImplementationHooks = (environmentMetadata) => {
    const hooks = [];
    plugins.forEach((plugin) => {
      try {
        if (plugin.register) {
          plugin.register(void 0, environmentMetadata);
        }
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
  const client = new import_js_client_sdk_common2.LDClientImpl(
    clientSideId,
    import_js_client_sdk_common2.AutoEnvAttributes.Enabled,
    platform2,
    {
      credentialType: "clientSideId",
      ...options
    },
    dataManagerFactory,
    {
      getImplementationHooks,
      credentialType: "clientSideId"
    }
  );
  client.identify?.(context);
  return client;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  init
});
//# sourceMappingURL=index.js.map