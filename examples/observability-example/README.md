# Observability Example

A console application demonstrating how to use the `unofficial-ld-node-client-sdk` with observability plugins for monitoring and telemetry collection.

## Features

- ✅ Observability plugin initialization
- ✅ Hook-based event tracking
- ✅ Telemetry collection
- ✅ Metrics reporting
- ✅ Real-time monitoring

## Prerequisites

- Node.js 18.0.0 or higher
- A LaunchDarkly client-side ID (get one at [LaunchDarkly](https://launchdarkly.com))

## Installation

```bash
npm install
```

## Setup

Before running the example, update `index.js` with your client-side ID:

```javascript
const clientSideId = 'YOUR_CLIENT_SIDE_ID';
```

## Running the Example

```bash
npm start
```

## Output

The example will:
1. Initialize the LaunchDarkly client
2. Register the observability plugin
3. Evaluate feature flags (with hook tracing)
4. Track custom events (with hook logging)
5. Identify new users
6. Collect and report telemetry metrics

Sample output:
```
📊 Observability Plugin registered
   Service: ld-observability-app
   Environment: production
   Client-side ID: your-id

✅ Client initialized

🎯 Evaluating feature flags:

📈 [EVAL] Flag: premium-features
   ✓ Value: false (user: observability-user-123)

📊 OBSERVABILITY METRICS REPORT
============================================================

⏱️  Uptime: 1.23s

📈 Flag Evaluations: 6
   • premium-features: 2 evaluations
     - false: 2x
   • beta-access: 1 evaluations
     - false: 1x

📍 Events: 3
   • feature-viewed: 2x
   • user-action: 1x
   • page-loaded: 1x

👤 User Identifications: 1

============================================================
```

## Plugin System

The example demonstrates a complete observability plugin that:

### Metadata
```javascript
getMetadata() {
  return { name: 'observability-plugin', version: '1.0.0' };
}
```

### Registration
```javascript
register(client, metadata) {
  // Called when plugin is registered
}
```

### Hooks
```javascript
getHooks() {
  return [{
    beforeEvaluation(context, data) { /* ... */ },
    afterEvaluation(context, data, detail) { /* ... */ },
    beforeIdentify(context, data) { /* ... */ },
    afterIdentify(context, data, result) { /* ... */ },
    afterTrack(context, eventKey, data) { /* ... */ },
  }];
}
```

## Monitoring Applications

This pattern is useful for:
- Tracing flag evaluations
- Collecting telemetry
- Performance monitoring
- Audit logging
- Analytics integration
- Error tracking

## Use Cases

### 1. Structured Logging
Capture all SDK operations in your logging system:
```javascript
afterEvaluation: (context, data, detail) => {
  logger.info('flag_evaluated', {
    flag: data.key,
    value: detail.value,
    user: context.key,
  });
}
```

### 2. APM Integration
Send metrics to your APM provider:
```javascript
afterEvaluation: (context, data, detail) => {
  apm.recordMetric('ld_flag_evaluation', {
    flag: data.key,
    value: detail.value,
  });
}
```

### 3. Event Streaming
Forward events to a streaming platform:
```javascript
afterTrack: (context, eventKey, data) => {
  eventStream.send({
    type: 'ld_event',
    event: eventKey,
    user: context.key,
    data: data,
  });
}
```

## Documentation

For more information, see the [unofficial-ld-node-client-sdk README](../../packages/unofficial-ld-node-client-sdk/README.md).
