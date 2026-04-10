# ld-js — Modern LaunchDarkly Client-Side Node & Electron SDK with Observability

## Repository: Clawppenheimer/ld-js

### What This Is

A monorepo containing three npm packages that together provide a modern, plugin-enabled LaunchDarkly client-side SDK for Node.js and Electron, with full observability support. All packages use only a **client-side ID** — no server SDK keys.

This is a cleanroom implementation that depends on LaunchDarkly's published npm packages (`@launchdarkly/js-sdk-common`, `@launchdarkly/js-client-sdk-common`) as libraries. All code in this repo is original.

### Why This Exists

LaunchDarkly's existing options have gaps:

| Existing SDK | Problem |
|---|---|
| `launchdarkly-node-client-sdk` (v3.3.1) | Old-gen. No plugin system. No hook system. Cannot support observability plugins. Depends on `launchdarkly-js-sdk-common@5.4.0` (old common). |
| `launchdarkly-electron-client-sdk` (v1.7.0) | Old-gen. Same limitations. Uses deprecated `electron.remote`. |
| `@launchdarkly/js-client-sdk` (v4.x, new-gen) | Browser-only. Requires `window`/`document`. Has full plugin+hook system. |
| `@launchdarkly/observability-node` | Server-side only. Peer-depends on `@launchdarkly/node-server-sdk`. Plugin imports types from `@launchdarkly/js-server-sdk-common`. Uses `TracingHook` which implements server-side `Hook` interface. Only reads `environmentMetadata.sdkKey`, no `clientSideId` fallback. |

The new-gen client-side SDK architecture (`js-client-sdk-common`) already has everything needed — `LDClientImpl`, `HookRunner`, `createPluginEnvironmentMetadata`, `Configuration` with `credentialType: 'clientSideId'`. It just needs a Node platform adapter instead of a browser one.

---

## Package Structure

```
ld-js/
├── packages/
│   ├── node-client-sdk/            # @Clawppenheimer/ld-node-client-sdk
│   ├── electron-sdk/               # @Clawppenheimer/ld-electron-sdk
│   └── observability-node-client/  # @Clawppenheimer/ld-observability-node-client
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Build + test on PR/push
│       ├── sync-js-core.yml        # Triggered when launchdarkly/js-core changes
│       ├── sync-observability.yml  # Triggered when launchdarkly/observability-sdk changes
│       └── sync-electron.yml       # Triggered when launchdarkly/electron-client-sdk changes
├── package.json                    # Workspace root
├── tsconfig.base.json
└── PLAN.md                         # This file
```

**Package manager**: npm workspaces (or pnpm — pick one, stay consistent)
**Language**: TypeScript
**Build**: tsup or unbuild (simple, handles CJS+ESM dual output)
**Test**: vitest (matches LaunchDarkly's test tooling)

---

## Package 1: `@Clawppenheimer/ld-node-client-sdk`

### Purpose

A new-gen client-side LaunchDarkly SDK for Node.js. Drop-in replacement for `launchdarkly-node-client-sdk` with plugin and hook support.

### Dependencies (from npm)

```json
{
  "dependencies": {
    "@launchdarkly/js-sdk-common": "^2.x",
    "@launchdarkly/js-client-sdk-common": "^1.x"
  }
}
```

These two published packages provide:
- `LDClientImpl` — the full client-side SDK implementation (flag evaluation, streaming, event processing, identify, track)
- `HookRunner` — before/after evaluation hooks, before/after identify hooks, after track hooks
- `LDPluginBase`, `LDPluginEnvironmentMetadata`, `LDPluginMetadata` — plugin interfaces
- `createPluginEnvironmentMetadata` — builds env metadata with `clientSideId` (not `sdkKey`)
- `Configuration` — config parser with `credentialType: 'clientSideId' | 'mobileKey'`
- `Context` — context utilities including `Context.fromLDContext()`

### What You Build (cleanroom)

#### `src/platform/` — Node Platform Adapter

The `js-client-sdk-common` `LDClientImpl` expects a `Platform` interface. The browser SDK provides a browser implementation. You provide a Node one:

| Platform Method | Implementation |
|---|---|
| `httpRequest(method, url, headers, body)` | `node:http` / `node:https`. Support TLS options. |
| `httpAllowsPost()` | `return true` (Node has no CORS) |
| `getCurrentUrl()` | `return undefined` (no URL in Node) |
| `isDoNotTrack()` | `return false` |
| `localStorage.get/set/clear` | Filesystem-based. Use a configurable directory (default: `os.homedir()/.launchdarkly/`). Store as JSON files keyed by environment+context hash. |
| `eventSourceFactory(url, options)` | Use `eventsource` npm package (or `launchdarkly-eventsource`). Do NOT use browser `EventSource`. |
| `eventSourceIsActive(es)` | Check `es.readyState === OPEN \|\| CONNECTING` |
| `eventSourceAllowsReport` | `return true` |
| `info.sdkData()` | `{ name: 'ld-node-client-sdk', version: '<package version>', userAgentBase: 'NodeClientSDK' }` |
| `info.platformData()` | `{ name: 'Node', nodeVersion: process.versions.node, osArch: os.arch(), osName: os.platform() }` |

**Reference** (for understanding the interface, not for copying): `launchdarkly/electron-client-sdk/src/electronPlatform.js` implements the old-gen version. The new-gen `Platform` interface is defined in `@launchdarkly/js-sdk-common`.

#### `src/index.ts` — Public API

```typescript
import { LDClientImpl } from '@launchdarkly/js-client-sdk-common';
import { createPlatform } from './platform';

export function init(
  clientSideId: string,
  context: LDContext,
  options?: LDOptions,
): LDClient {
  const platform = createPlatform(options);
  const client = new LDClientImpl(
    clientSideId,
    context,
    platform,
    {
      credentialType: 'clientSideId',
      ...options,
    },
  );
  return client;
}
```

The `LDClientImpl` constructor handles:
- Plugin registration (calls `plugin.register(client, environmentMetadata)`)
- Hook collection (calls `plugin.getHooks(environmentMetadata)`)
- Streaming connection to LD
- Flag evaluation with hook wrapping via `HookRunner.withEvaluation()`
- Event processing (track, identify)
- Everything.

You do NOT need to implement any of this. It's all in `js-client-sdk-common`.

#### `src/types.ts` — Extended Options

```typescript
import { LDOptions as LDOptionsBase } from '@launchdarkly/js-client-sdk-common';

export interface LDOptions extends LDOptionsBase {
  /** Filesystem path for flag cache. Default: ~/.launchdarkly/ */
  storagePath?: string;
  /** TLS parameters for HTTPS requests */
  tlsParams?: TLSOptions;
}
```

### Plugin System (inherited, no code needed)

When a user passes `plugins: [new SomePlugin()]` in options, `LDClientImpl` automatically:
1. Calls `plugin.getHooks(environmentMetadata)` — collects hooks
2. Calls `plugin.register(client, environmentMetadata)` — registers plugin
3. `environmentMetadata` contains `{ sdk: {...}, clientSideId: '<the-id>' }` because `credentialType` is `'clientSideId'`
4. All `variation()` calls go through `HookRunner.withEvaluation()` which calls `beforeEvaluation` and `afterEvaluation` on all hooks
5. All `identify()` calls trigger `beforeIdentify`/`afterIdentify` hooks
6. All `track()` calls trigger `afterTrack` hooks

### Testing Strategy

- Unit tests for platform adapter (HTTP, SSE, storage)
- Integration test: init with a real client-side ID, verify streaming connection, evaluate a flag
- Plugin test: create a mock plugin, verify `register()` called with `clientSideId` in metadata, verify hooks fire on `variation()`
- Offline test: init with cached flags, verify evaluation works without network

---

## Package 2: `@Clawppenheimer/ld-observability-node-client`

### Purpose

A cleanroom observability plugin for client-side Node SDKs. Ships errors, logs, metrics, and traces to LaunchDarkly's observability backend via OTLP. Works with `@Clawppenheimer/ld-node-client-sdk` or any SDK that implements `LDPluginBase`.

### Dependencies (from npm)

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.x",
    "@opentelemetry/sdk-node": "^0.x",
    "@opentelemetry/sdk-trace-base": "^1.x",
    "@opentelemetry/sdk-logs": "^0.x",
    "@opentelemetry/sdk-metrics": "^1.x",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.x",
    "@opentelemetry/auto-instrumentations-node": "^0.x",
    "@opentelemetry/context-async-hooks": "^1.x",
    "@opentelemetry/core": "^1.x",
    "@opentelemetry/resources": "^1.x",
    "@opentelemetry/semantic-conventions": "^1.x",
    "@launchdarkly/js-sdk-common": "^2.x"
  },
  "peerDependencies": {
    "@launchdarkly/js-client-sdk-common": "^1.x"
  }
```

### What You Build (cleanroom)

#### `src/plugin.ts` — The Plugin

Implements `LDPluginBase` from `@launchdarkly/js-sdk-common`. This is the entry point.

```typescript
import type {
  LDPluginBase,
  LDPluginMetadata,
  LDPluginEnvironmentMetadata,
} from '@launchdarkly/js-sdk-common';
import type { Hook } from '@launchdarkly/js-client-sdk-common/integrations';

export class Observability implements LDPluginBase<unknown, Hook> {
  constructor(private readonly options?: ObservabilityOptions) {}

  getMetadata(): LDPluginMetadata {
    return { name: '@Clawppenheimer/ld-observability-node-client' };
  }

  register(
    _client: unknown,
    environmentMetadata: LDPluginEnvironmentMetadata,
  ): void {
    // Credential fallback: clientSideId (client-side SDKs) > mobileKey > sdkKey (server)
    const credential =
      environmentMetadata.clientSideId ??
      environmentMetadata.mobileKey ??
      environmentMetadata.sdkKey ??
      '';

    // Initialize the telemetry client
    this._telemetryClient = new TelemetryClient(credential, this.options);
  }

  getHooks(metadata: LDPluginEnvironmentMetadata): Hook[] {
    // Return inline hooks — do NOT use TracingHook from @launchdarkly/node-server-sdk-otel
    // Model after the browser plugin's approach (highlight-run/src/plugins/observe.ts)
    return [{
      getMetadata: () => ({ name: '@Clawppenheimer/observability-hooks' }),

      afterEvaluation: (hookContext, data, detail) => {
        // Record flag evaluation as OTel span event
        // Attributes: flag key, value, variation index, context id, provider
        return data;
      },

      afterIdentify: (hookContext, data, result) => {
        // Record identify as log event
        return data;
      },

      afterTrack: (hookContext) => {
        // Record track as span
      },
    }];
  }
}
```

**Critical**: The client-side `Hook` interface (from `@launchdarkly/js-client-sdk-common`) is different from the server-side one:

| Field | Server Hook | Client Hook |
|---|---|---|
| `EvaluationSeriesContext.method` | Present (string) | **Absent** (omitted for bundle size) |
| `EvaluationSeriesContext.environmentId` | Present (optional) | **Absent** |
| `EvaluationSeriesContext.context` | Required (`LDContext`) | **Optional** (`LDContext?`) |
| `beforeIdentify` / `afterIdentify` | Not present | Present |
| `afterTrack` | Not present | Present |

This is why you cannot use `TracingHook` from `@launchdarkly/node-server-sdk-otel` — it implements the server-side interface, reads `hookContext.method` (which doesn't exist client-side), and doesn't handle optional context.

#### `src/telemetry-client.ts` — The OTLP Engine

Cleanroom reimplementation of the telemetry pipeline. Ships data to LD's observability backend.

**Endpoints**:
- OTLP traces: `https://otel.observability.app.launchdarkly.com:4318/v1/traces`
- OTLP logs: `https://otel.observability.app.launchdarkly.com:4318/v1/logs`
- OTLP metrics: `https://otel.observability.app.launchdarkly.com:4318/v1/metrics`
- Sampling config: `https://pub.observability.app.launchdarkly.com` (GraphQL query `GetSamplingConfig` with variable `organization_verbose_id`)

**Resource attributes** (stamped on every span/log/metric):
- `highlight.project_id` = the credential string (client-side ID)
- `telemetry.distro.name` = `@Clawppenheimer/ld-observability-node-client`
- `telemetry.distro.version` = package version
- `service.name` = from options
- `service.version` = from options
- `deployment.environment` = from options

**OTel pipeline setup**:
```
NodeSDK({
  resource: resourceFromAttributes(attributes),
  spanProcessors: [BatchSpanProcessor(SamplingTraceExporter)],
  logRecordProcessors: [BatchLogRecordProcessor(SamplingLogExporter)],
  metricReader: PeriodicExportingMetricReader(OTLPMetricExporter),
  contextManager: AsyncLocalStorageContextManager,
  sampler: AlwaysOnSampler,
  instrumentations: getNodeAutoInstrumentations({...}),
  textMapPropagator: CompositePropagator([W3CBaggagePropagator, W3CTraceContextPropagator]),
})
```

**Console hooking**: Intercept `console.log/info/warn/error` → emit as OTel log records. Configurable via `disableConsoleRecording` option.

**Process error hooking**: Listen on `process.on('uncaughtException')`, `process.on('unhandledRejection')` → record as OTel span exceptions.

**Flush on exit**: Listen on `beforeExit`, `exit`, `SIGABRT`, `SIGTERM`, `SIGINT` → flush all processors.

#### `src/sampling.ts` — Sampling Config

GraphQL query to `pub.observability.app.launchdarkly.com`:

```graphql
query GetSamplingConfig($organization_verbose_id: String!) {
  sampling(organization_verbose_id: $organization_verbose_id) {
    spans {
      name { regexValue, matchValue }
      attributes { key { regexValue, matchValue }, attribute { regexValue, matchValue } }
      events { name { regexValue, matchValue }, attributes { ... } }
      samplingRatio
    }
    logs {
      message { regexValue, matchValue }
      severityText { regexValue, matchValue }
      attributes { ... }
      samplingRatio
    }
  }
}
```

The `organization_verbose_id` is the credential string (client-side ID). The backend already accepts client-side IDs — the browser SDK has been sending them via `@launchdarkly/observability`.

Implement `CustomSampler` and `ExportSampler` that apply the returned sampling ratios to spans and logs before export.

#### `src/observe.ts` — Public Singleton API

```typescript
export const LDObserve = {
  recordError(error: Error, metadata?: Attributes): void,
  recordLog(message: string, level: string, metadata?: Attributes): void,
  recordMetric(metric: { name: string, value: number, tags?: {name: string, value: string}[] }): void,
  recordCount(metric: ...): void,
  recordIncr(metric: ...): void,
  recordHistogram(metric: ...): void,
  recordUpDownCounter(metric: ...): void,
  flush(): Promise<void>,
  stop(): Promise<void>,
  setAttributes(attributes: Attributes): void,
};
```

#### `src/options.ts` — Configuration

```typescript
export interface ObservabilityOptions {
  /** OTLP endpoint. Default: https://otel.observability.app.launchdarkly.com:4318 */
  otlpEndpoint?: string;
  /** Backend URL for sampling config. Default: https://pub.observability.app.launchdarkly.com */
  backendUrl?: string;
  /** Service name for OTel resource. */
  serviceName?: string;
  /** Service version. */
  serviceVersion?: string;
  /** Environment (development/staging/production). */
  environment?: string;
  /** Additional OTel resource attributes. */
  attributes?: Attributes;
  /** Disable console.log/warn/error interception. Default: false. */
  disableConsoleRecording?: boolean;
  /** Which console methods to record. Default: all. */
  consoleMethodsToRecord?: string[];
  /** Serialize object arguments in console output. Default: false. */
  serializeConsoleAttributes?: boolean;
}
```

**Electron-specific recommendations** (document these):
- Disable irrelevant instrumentations via `OTEL_NODE_DISABLED_INSTRUMENTATIONS=pg,prisma,grpc`
- Set `serviceName: 'your-app-main'` to distinguish main process telemetry
- Lower flush interval in desktop context (30s default is fine)

### Testing Strategy

- Unit test: plugin registers, hooks fire, credential fallback works
- Integration test: init with mock OTLP endpoint, verify spans/logs/metrics arrive with correct `highlight.project_id`
- Sampling test: mock GraphQL endpoint returns sampling config, verify sampler applies ratios
- Console hook test: `console.error('test')` → verify log record emitted
- Error hook test: throw unhandled → verify span exception recorded

---

## Package 3: `@Clawppenheimer/ld-electron-sdk`

### Purpose

Modern Electron SDK that wires together the node-client-sdk (main process) and the official browser SDK (renderer process) via IPC, with observability in both processes.

### Dependencies

```json
{
  "dependencies": {
    "@Clawppenheimer/ld-node-client-sdk": "workspace:*"
  },
  "peerDependencies": {
    "electron": ">=20.0.0",
    "@launchdarkly/js-client-sdk": "^4.x",
    "@Clawppenheimer/ld-observability-node-client": "workspace:*"
  }
}
```

The renderer-side packages (`@launchdarkly/js-client-sdk`, `@launchdarkly/observability`, `@launchdarkly/session-replay`) are the user's choice — they install them directly in their app.

### What You Build (cleanroom)

#### `src/main.ts` — Main Process Entry

```typescript
import { init as initNodeClient } from '@Clawppenheimer/ld-node-client-sdk';
import { createMainStateTracker } from './ipc/main-tracker';

export function initializeInMain(
  clientSideId: string,
  context: LDContext,
  options?: ElectronMainOptions,
): LDClient {
  const client = initNodeClient(clientSideId, context, {
    ...options,
    plugins: options?.plugins ?? [],
  });

  // Create IPC state tracker — broadcasts flag state to all renderer windows
  const tracker = createMainStateTracker(clientSideId, client, options?.logger);

  return client;
}
```

#### `src/renderer.ts` — Renderer Process Entry

```typescript
export function createRendererStateProvider(
  clientSideId?: string,
): StateProvider {
  // Returns a state provider object that the official browser SDK
  // can use instead of its own streaming connection.
  // Listens for flag state via IPC from main process.
}
```

Usage in renderer:
```typescript
import { init } from '@launchdarkly/js-client-sdk';
import { ObservabilityPlugin } from '@launchdarkly/observability';
import { SessionReplayPlugin } from '@launchdarkly/session-replay';
import { createRendererStateProvider } from '@Clawppenheimer/ld-electron-sdk/renderer';

const ldClient = init('client-side-id', context, {
  stateProvider: createRendererStateProvider('client-side-id'),
  streaming: false,    // main process handles streaming
  plugins: [new ObservabilityPlugin(), new SessionReplayPlugin()],
});
```

#### `src/preload.ts` — Preload Script Helpers

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('ldElectron', {
  onFlagInit: (callback) => ipcRenderer.on('ld:init', (_, data) => callback(data)),
  onFlagUpdate: (callback) => ipcRenderer.on('ld:update', (_, data) => callback(data)),
  sendEvent: (event) => ipcRenderer.send('ld:event', event),
  getInitialState: () => ipcRenderer.invoke('ld:get-state'),
});
```

**Critical difference from old Electron SDK**: Uses `contextBridge` + `ipcRenderer.invoke` (modern, secure). The old SDK used `electron.remote` which is deprecated and disabled by default in modern Electron.

#### `src/ipc/main-tracker.ts` — IPC State Tracker

Runs in main process. Responsibilities:

1. Listen for `client.on('ready')` → broadcast initial flag state to all `BrowserWindow` webContents via `webContents.send('ld:init', state)`
2. Listen for flag changes → broadcast `ld:update` with changed flags
3. Listen for `identify()` → broadcast updated context
4. Listen for `ld:event` from renderer (via `ipcMain.on`) → forward analytics events to main client's event processor
5. Handle `ld:get-state` (via `ipcMain.handle`) → return current flag state for late-joining windows

**IPC channels**:
- `ld:init` — main → renderer: `{ environment, context, flags }`
- `ld:update` — main → renderer: `{ flags?, context? }`
- `ld:event` — renderer → main: analytics event object
- `ld:get-state` — renderer → main (invoke/handle): returns current state

#### `src/ipc/renderer-provider.ts` — Renderer State Provider

Runs in renderer process. Implements the `stateProvider` interface expected by `@launchdarkly/js-client-sdk`:

1. On `ld:init` → emit `'init'` event with flag state
2. On `ld:update` → emit `'update'` event with flag changes
3. `enqueueEvent(event)` → send `ld:event` to main via IPC
4. `getInitialState()` → call `ld:get-state` invoke for synchronous init if main is already ready

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Main Process                                                │
│                                                             │
│  @Clawppenheimer/ld-node-client-sdk                               │
│    └─ streams flags from LD (single connection)             │
│    └─ evaluates flags locally from cache                    │
│    └─ HookRunner fires hooks on variation/identify/track    │
│                                                             │
│  @Clawppenheimer/ld-observability-node-client (plugin)            │
│    └─ captures errors, logs, traces from main process       │
│    └─ ships OTLP to LD observability backend                │
│                                                             │
│  IPC State Tracker                                          │
│    └─ broadcasts flag state to renderer via webContents     │
│    └─ receives analytics events from renderer via ipcMain   │
│                                                             │
│         │ ld:init, ld:update (down)                         │
│         │ ld:event (up)                                     │
│         ▼                                                   │
│  ┌──────────────── contextBridge ──────────────────┐        │
│  │ Preload Script                                  │        │
│  │  exposes: onFlagInit, onFlagUpdate, sendEvent   │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Renderer Process                                            │
│                                                             │
│  @launchdarkly/js-client-sdk (official, unmodified)         │
│    └─ receives flag state via stateProvider (no streaming)  │
│    └─ HookRunner fires hooks on variation/identify/track    │
│                                                             │
│  @launchdarkly/observability (official plugin)              │
│    └─ captures errors, Web Vitals, console, network         │
│    └─ ships to LD observability backend                     │
│                                                             │
│  @launchdarkly/session-replay (official plugin)             │
│    └─ records DOM mutations for session playback            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Testing Strategy

- Unit test: IPC tracker broadcasts on flag change, receives events
- Integration test: spin up Electron main+renderer, verify flag state syncs
- Preload test: verify contextBridge exposes correct API
- Multi-window test: open two windows, verify both receive flag updates

---

## Upstream Dependencies & Sync Strategy

### Dependency Map

| Package | Depends On (npm) | Upstream Repo |
|---|---|---|
| `@Clawppenheimer/ld-node-client-sdk` | `@launchdarkly/js-sdk-common`, `@launchdarkly/js-client-sdk-common` | `launchdarkly/js-core` |
| `@Clawppenheimer/ld-observability-node-client` | `@launchdarkly/js-sdk-common`, `@opentelemetry/*` | `launchdarkly/js-core`, `launchdarkly/observability-sdk` |
| `@Clawppenheimer/ld-electron-sdk` | `@launchdarkly/js-client-sdk` (peer) | `launchdarkly/js-core` |

### What To Watch For

#### `launchdarkly/js-core` (primary dependency)

This is the monorepo for all new-gen JS SDKs. Changes here can break your packages.

**Watch these paths**:
- `packages/shared/common/src/api/integrations/plugins.ts` — `LDPluginBase`, `LDPluginEnvironmentMetadata` interfaces. If fields are added/removed/renamed, your plugin wrapper needs updating.
- `packages/shared/sdk-client/src/api/integrations/Hooks.ts` — `Hook` interface, `EvaluationSeriesContext`, `IdentifySeriesContext`, `TrackSeriesContext`. If hook lifecycle methods change, your inline hooks need updating.
- `packages/shared/sdk-client/src/HookRunner.ts` — how hooks are invoked. If the calling convention changes, verify your hooks still work.
- `packages/shared/sdk-client/src/LDClientImpl.ts` — the client implementation you depend on. Constructor signature, platform interface expectations.
- `packages/shared/sdk-client/src/plugins/createPluginEnvironmentMetadata.ts` — how `clientSideId` gets set. Currently: `[config.credentialType]: sdkKey` where `credentialType` is `'clientSideId'` for client-side SDKs.
- `packages/shared/sdk-client/src/configuration/Configuration.ts` — `credentialType`, options shape.

**Trigger**: GitHub Actions workflow that fires on new releases/tags of `@launchdarkly/js-sdk-common` or `@launchdarkly/js-client-sdk-common` on npm, or on pushes to `packages/shared/` in `js-core`.

**Action**: Run your test suite against the new version. If tests pass, bump dep and release. If tests fail, investigate breaking change and adapt.

#### `launchdarkly/observability-sdk` (reference for telemetry protocol)

Your observability package is cleanroom, but it speaks the same protocol. If LD changes the OTLP ingest format, sampling config GraphQL schema, or endpoint URLs, your telemetry will break silently (data stops appearing in dashboard).

**Watch these paths**:
- `sdk/@launchdarkly/observability-node/src/client/ObservabilityClient.ts` — OTLP endpoint URLs (`otel.observability.app.launchdarkly.com:4318`), resource attribute names (`highlight.project_id`), OTel pipeline configuration.
- `sdk/@launchdarkly/observability-node/src/graph/` — GraphQL schema for sampling config. The query shape, variable names (`organization_verbose_id`), response types.
- `sdk/@launchdarkly/observability-node/src/api/Options.ts` — `NodeOptions` shape. If they add new config that changes behavior, you may want to match.
- `sdk/@launchdarkly/observability-shared/` — shared sampling logic, constants, propagator. Used by both browser and node.
- `sdk/highlight-run/src/plugins/observe.ts` — the browser plugin's inline hooks. This is your reference implementation for how hooks should record flag evaluations, identify, and track events. If the OTel span/event attribute names change here, yours should match for dashboard compatibility.

**Key attributes to keep in sync** (from `highlight-run/src/integrations/launchdarkly/`):
- `feature_flag.key`
- `feature_flag.provider.name` = `'LaunchDarkly'`
- `feature_flag.context.id`
- `feature_flag.result.value`
- `feature_flag.result.variationIndex`
- `feature_flag.result.reason.*`
- `feature_flag.environment`
- `feature_flag.set.id`

**Trigger**: GitHub Actions workflow on pushes to `sdk/@launchdarkly/observability-node/` or `sdk/@launchdarkly/observability-shared/` or `sdk/highlight-run/src/plugins/observe.ts`.

**Action**: Diff the upstream changes against your implementation. Flag any endpoint/schema/attribute changes for manual review.

#### `launchdarkly/electron-client-sdk` (legacy reference only)

This is the old Electron SDK. It's unlikely to see meaningful updates. Watch it only for:
- Deprecation notices
- Any signal that LD is building an official new-gen Electron SDK (at which point you'd evaluate sunsetting yours)

**Trigger**: Low priority. Monthly check or on new npm release.

### Sync Workflow Template

```yaml
# .github/workflows/sync-js-core.yml
name: Sync with js-core
on:
  schedule:
    - cron: '0 8 * * 1'  # Weekly Monday 8am
  workflow_dispatch:
    inputs:
      version:
        description: 'Specific version to test against'

jobs:
  check-upstream:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - name: Check for new upstream versions
        run: |
          COMMON_LATEST=$(npm view @launchdarkly/js-sdk-common version)
          CLIENT_COMMON_LATEST=$(npm view @launchdarkly/js-client-sdk-common version)
          echo "js-sdk-common: $COMMON_LATEST"
          echo "js-client-sdk-common: $CLIENT_COMMON_LATEST"
          # Compare with current pinned versions
          # If different, run tests with new versions
      - name: Test with latest upstream
        run: |
          npm install @launchdarkly/js-sdk-common@latest @launchdarkly/js-client-sdk-common@latest
          npm test
      - name: Create PR if tests pass
        if: success()
        run: |
          # Create PR bumping dependency versions
```

---

## Build Order & Milestones

### Phase 1: `@Clawppenheimer/ld-node-client-sdk` (Foundation)

**Goal**: A working client-side Node SDK with plugin support.

1. Scaffold monorepo (workspaces, tsconfig, build tooling)
2. Implement Node platform adapter (HTTP, SSE, filesystem storage)
3. Wire `LDClientImpl` with platform adapter
4. Verify: `init('client-side-id', context)` → connects to LD, streams flags
5. Verify: `client.variation('flag', false)` returns correct value
6. Verify: `plugins: [mockPlugin]` → `register()` called with `clientSideId` in metadata
7. Verify: hooks fire on `variation()`, `identify()`, `track()`
8. Publish `0.1.0`

### Phase 2: `@Clawppenheimer/ld-observability-node-client` (Telemetry)

**Goal**: Observability plugin that ships data to LD's backend using a client-side ID.

1. Implement `TelemetryClient` (OTel pipeline, OTLP exporters, sampling)
2. Implement `Observability` plugin class with inline client-side hooks
3. Implement console hooking and process error capture
4. Implement `LDObserve` singleton for manual instrumentation
5. Verify: plugin registers with client-side ID → data appears in LD observability dashboard
6. Verify: flag evaluations create span events with correct attributes
7. Verify: `console.error('test')` → log record in dashboard
8. Publish `0.1.0`

### Phase 3: `@Clawppenheimer/ld-electron-sdk` (Integration)

**Goal**: Electron SDK wiring main↔renderer with observability in both.

1. Implement main-side state tracker (IPC broadcast)
2. Implement renderer-side state provider (IPC listener)
3. Implement preload script helpers (contextBridge)
4. Verify: main process flags sync to renderer
5. Verify: renderer analytics events reach main
6. Verify: observability in both processes → data in LD dashboard
7. Publish `0.1.0`

### Phase 4: Hardening

1. Offline mode (flag cache, event queuing)
2. Multi-window support (verified)
3. Reconnect with exponential backoff
4. Graceful shutdown (flush all telemetry on app quit)
5. CI/CD: automated sync workflows, release automation
6. Documentation

---

## End-State Usage

### Electron App — Main Process

```typescript
import { initializeInMain } from '@Clawppenheimer/ld-electron-sdk';
import { Observability } from '@Clawppenheimer/ld-observability-node-client';

const ldClient = initializeInMain('client-side-id', context, {
  plugins: [
    new Observability({
      serviceName: 'my-app-main',
      environment: 'production',
    }),
  ],
});

await ldClient.waitForInitialization();
const showFeature = ldClient.variation('new-feature', false);
```

### Electron App — Renderer Process

```typescript
import { init } from '@launchdarkly/js-client-sdk';
import { ObservabilityPlugin } from '@launchdarkly/observability';
import { SessionReplayPlugin } from '@launchdarkly/session-replay';
import { createRendererStateProvider } from '@Clawppenheimer/ld-electron-sdk/renderer';

const ldClient = init('client-side-id', context, {
  stateProvider: createRendererStateProvider(),
  streaming: false,
  plugins: [new ObservabilityPlugin(), new SessionReplayPlugin()],
});
```

### Standalone Node (CLI tool, desktop agent, etc.)

```typescript
import { init } from '@Clawppenheimer/ld-node-client-sdk';
import { Observability } from '@Clawppenheimer/ld-observability-node-client';

const ldClient = init('client-side-id', context, {
  plugins: [new Observability({ serviceName: 'my-cli-tool' })],
});
```

### Everything Uses Only a Client-Side ID. No Server SDK Keys.
