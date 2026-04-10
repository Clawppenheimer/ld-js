# Observability Example

A console application demonstrating how to use the `unofficial-ld-node-client-sdk` with OpenTelemetry integration for distributed tracing, metrics, and monitoring.

## Features

- ✅ OpenTelemetry SDK initialization
- ✅ OTLP exporter for telemetry data
- ✅ Distributed tracing of flag evaluations
- ✅ Event tracking with automatic span creation
- ✅ Integration with APM tools (Jaeger, Datadog, New Relic, etc.)
- ✅ Vendor-agnostic observability via OTLP

## Prerequisites

- Node.js 18.0.0 or higher
- A LaunchDarkly client-side ID (get one at [LaunchDarkly](https://launchdarkly.com))

## Installation

```bash
npm install
```

## Setup

### 1. Configure LaunchDarkly Environment ID

Update `index.js` with your environment ID:

```javascript
const environmentId = 'YOUR_ENVIRONMENT_ID';
```

### 2. Configure OTLP Endpoint (Optional)

By default, spans are exported to `http://localhost:4318`. You can override:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otlp-endpoint.com
npm start
```

Or set it directly:

```javascript
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
```

### 3. Start an OpenTelemetry Collector (Optional)

For local testing, use OpenTelemetry Collector:

```bash
docker run -p 4318:4318 otel/opentelemetry-collector-contrib:latest
```

Or use Jaeger for local development:

```bash
docker run -d -p 6831:6831/udp -p 6832:6832/udp -p 16686:16686 jaegertracing/all-in-one
```

## Running the Example

```bash
npm start
```

## Output

The example will:
1. Initialize OpenTelemetry SDK and OTLP exporter
2. Initialize the LaunchDarkly client with OpenTelemetry plugin
3. Create trace spans for each flag evaluation
4. Create trace spans for each event tracked
5. Export spans to OTLP endpoint
6. Report telemetry summary

Sample output:
```
🚀 Initializing OpenTelemetry...

✅ OpenTelemetry initialized
   Exporter: OTLP (http://localhost:4318)

🚀 Initializing LaunchDarkly client with OpenTelemetry...

📊 OpenTelemetry Plugin registered
   Service: ld-observability-example
   OTLP Endpoint: http://localhost:4318
   Tracer: Active

✅ Client initialized

🎯 Evaluating feature flags:

📈 [TRACE] Flag evaluation started: premium-features
   ✓ Value: false [trace recorded]

📊 OPENTELEMETRY TELEMETRY REPORT
======================================================================

🏠 Service: ld-observability-example
📤 OTLP Exporter: http://localhost:4318
⏱️  Uptime: 3.45s

📈 Spans Generated:
   • Flag Evaluations: 6
   • Events Tracked: 3
   • Total Spans: 10

📤 Telemetry Data:
   • Traces: Being exported to http://localhost:4318
   • Metrics: Enabled via OpenTelemetry SDK
   • Logs: Can be integrated via Pino/Winston + OTel

💡 Integration Points:
   • APM Tools: Jaeger, Datadog, New Relic, etc.
   • Observability Platforms: Grafana, Splunk, etc.
   • Data Lakes: Collect and analyze at scale

======================================================================
```

## OpenTelemetry Integration

### Plugin Architecture

The example demonstrates an OpenTelemetry plugin that hooks into SDK lifecycle events and creates trace spans:

```javascript
getHooks() {
  return [{
    beforeEvaluation: (context, data) => {
      // Create trace span for flag evaluation
      const span = this.tracer.startSpan('ld:flag:evaluate', {
        attributes: {
          'launchdarkly.flag.key': data.key,
          'launchdarkly.user.key': context.key,
        },
      });
      return data;
    },
    
    afterEvaluation: (context, data, detail) => {
      // End span with result
      span.setAttributes({
        'launchdarkly.flag.value': String(detail.value),
      });
      span.end();
      return data;
    },
    
    // Similar for identify, track events...
  }];
}
```

### OpenTelemetry SDK Setup

```javascript
const otelSdk = new NodeSDK({
  resource: new Resource({
    'service.name': 'ld-observability-example',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

await otelSdk.start();
```

## Common Use Cases

### 1. APM Integration (Datadog, New Relic, etc.)

Export spans directly to your APM:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=https://api.datadoghq.com
export OTEL_EXPORTER_OTLP_HEADERS="dd-api-key=YOUR_API_KEY"
npm start
```

### 2. Local Tracing with Jaeger

Visualize traces in Jaeger UI:

```bash
# Terminal 1: Start Jaeger
docker run -p 6831:6831/udp -p 16686:16686 jaegertracing/all-in-one

# Terminal 2: Run example
npm start

# Terminal 3: View traces
open http://localhost:16686
```

### 3. Vendor-Neutral Collection with Collector

Use OpenTelemetry Collector to forward to multiple backends:

```yaml
# otel-collector-config.yaml
exporters:
  otlp:
    endpoint: api.otlp.provider.com
  datadog:
    api:
      key: YOUR_KEY
processors:
  batch: {}
service:
  pipelines:
    traces:
      exporters: [otlp, datadog]
```

### 4. Distributed Tracing Across Services

Link LaunchDarkly operations to your application traces:

```javascript
// Create child span within parent context
const parentSpan = trace.getActiveSpan();
const childSpan = tracer.startSpan('ld:flag:evaluate', {
  parent: parentSpan,
});
```

## Documentation

For more information, see the [unofficial-ld-node-client-sdk README](../../packages/unofficial-ld-node-client-sdk/README.md).
