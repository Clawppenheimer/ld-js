"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createPlatform: () => createPlatform,
  init: () => init
});
module.exports = __toCommonJS(index_exports);
var import_js_client_sdk_common = require("@launchdarkly/js-client-sdk-common");

// src/platform/index.ts
function createPlatform(options) {
  return {
    // HTTP client using browser Fetch API
    http: {
      fetch: async (url, opts) => {
        try {
          const response = await fetch(url, opts);
          const text = await response.text();
          return {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            body: text
          };
        } catch (error) {
          throw new Error(`HTTP request failed: ${error}`);
        }
      }
    },
    // Crypto operations using native Web Crypto API
    crypto: {
      createHash: (algorithm) => {
        const cryptoAlgorithm = algorithm === "sha256" ? "SHA-256" : algorithm.toUpperCase();
        return {
          update: function(data) {
            this.data = (this.data || "") + data;
            return this;
          },
          digest: async function(encoding = "hex") {
            const encoder = new TextEncoder();
            const data = encoder.encode(this.data);
            const hashBuffer = await crypto.subtle.digest(cryptoAlgorithm, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            if (encoding === "hex") {
              return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
            } else {
              const binary = String.fromCharCode(...hashArray);
              return btoa(binary);
            }
          }
        };
      },
      createHmac: (algorithm, key) => {
        const cryptoAlgorithm = algorithm === "sha256" ? "SHA-256" : algorithm.toUpperCase();
        const encoder = new TextEncoder();
        return {
          update: function(data) {
            this.data = (this.data || "") + data;
            return this;
          },
          digest: async function(encoding = "hex") {
            try {
              const keyData = encoder.encode(key);
              const cryptoKey = await crypto.subtle.importKey(
                "raw",
                keyData,
                { name: "HMAC", hash: cryptoAlgorithm },
                false,
                ["sign"]
              );
              const data = encoder.encode(this.data);
              const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
              const hashArray = Array.from(new Uint8Array(signature));
              if (encoding === "hex") {
                return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
              } else {
                const binary = String.fromCharCode(...hashArray);
                return btoa(binary);
              }
            } catch (error) {
              throw new Error(`HMAC operation failed: ${error}`);
            }
          }
        };
      },
      randomUUID: () => {
        return crypto.randomUUID();
      }
    },
    // Storage using localStorage
    storage: {
      getItem: (key) => {
        try {
          return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
        } catch (error) {
          console.warn(`Failed to read from localStorage: ${error}`);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(key, value);
          }
        } catch (error) {
          console.warn(`Failed to write to localStorage: ${error}`);
        }
      },
      removeItem: (key) => {
        try {
          if (typeof localStorage !== "undefined") {
            localStorage.removeItem(key);
          }
        } catch (error) {
          console.warn(`Failed to remove from localStorage: ${error}`);
        }
      },
      clear: async (key) => {
        try {
          if (typeof localStorage !== "undefined") {
            if (key) {
              localStorage.removeItem(key);
            } else {
              localStorage.clear();
            }
          }
        } catch (error) {
          console.warn(`Failed to clear localStorage: ${error}`);
        }
      }
    },
    // Encoding operations
    encoding: {
      btoa: (data) => {
        return btoa(data);
      },
      atob: (data) => {
        return atob(data);
      }
    },
    // EventSource for streaming updates
    eventSource: {
      async createEventSource(url) {
        if (typeof EventSource !== "undefined") {
          return new EventSource(url);
        } else {
          throw new Error("EventSource is not available in this Electron environment");
        }
      }
    },
    // Console logging
    logger: {
      debug: (msg) => console.debug(`[LD:DEBUG] ${msg}`),
      info: (msg) => console.info(`[LD:INFO] ${msg}`),
      warn: (msg) => console.warn(`[LD:WARN] ${msg}`),
      error: (msg) => console.error(`[LD:ERROR] ${msg}`)
    }
  };
}

// src/data-manager.ts
var import_js_sdk_common = require("@launchdarkly/js-sdk-common");
function createStreamingDataManager(platform, sdkKey, baseUrl) {
  const baseDataManager = new import_js_sdk_common.BaseDataManager(sdkKey, baseUrl);
  return baseDataManager;
}

// src/index.ts
function init(environmentId, context, options) {
  const platform = createPlatform(options);
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
  const client = new import_js_client_sdk_common.LDClientImpl(
    environmentId,
    import_js_client_sdk_common.AutoEnvAttributes.Enabled,
    platform,
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
  return client;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPlatform,
  init
});
//# sourceMappingURL=index.js.map