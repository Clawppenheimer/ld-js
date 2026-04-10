/**
 * Observability Example: unofficial-ld-node-client-sdk with OpenTelemetry
 *
 * This example demonstrates:
 * 1. Initializing the LaunchDarkly client
 * 2. Setting up OpenTelemetry integration (OTLP endpoint)
 * 3. Evaluating feature flags with automatic telemetry
 * 4. Tracking metrics and traces automatically
 * 5. Showing telemetry data being sent to OTLP endpoint
 */

import { init } from 'unofficial-ld-node-client-sdk';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-proto-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace } from '@opentelemetry/api';

/**
 * OpenTelemetry Plugin for LaunchDarkly
 *
 * This plugin demonstrates how to integrate OpenTelemetry with LaunchDarkly SDK
 * to automatically collect and export telemetry data (traces, metrics, logs)
 * to an OTLP-compatible endpoint.
 */
class OpenTelemetryPlugin {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'ld-app';
    this.otelEndpoint = options.otelEndpoint || 'http://localhost:4318';
    this.tracer = null;
    this.metrics = {
      evaluationCount: 0,
      eventCount: 0,
      startTime: Date.now(),
    };
  }

  getMetadata() {
    return {
      name: 'opentelemetry-plugin',
      version: '1.0.0',
    };
  }

  register(client, metadata) {
    // Get the global tracer
    this.tracer = trace.getTracer('ld-opentelemetry-plugin', '1.0.0');

    console.log('📊 OpenTelemetry Plugin registered');
    console.log(`   Service: ${this.serviceName}`);
    console.log(`   OTLP Endpoint: ${this.otelEndpoint}`);
    console.log(`   Tracer: Active\n`);
  }

  getHooks() {
    return [
      {
        getMetadata: () => ({ name: 'otel-hook' }),

        beforeEvaluation: (context, evaluationData) => {
          // Create a span for flag evaluation
          const span = this.tracer?.startSpan('ld:flag:evaluate', {
            attributes: {
              'launchdarkly.flag.key': evaluationData.key,
              'launchdarkly.user.key': context.key,
              'service.name': this.serviceName,
            },
          });

          console.log(`📈 [TRACE] Flag evaluation started: ${evaluationData.key}`);

          // Store span in context for afterEvaluation
          evaluationData._span = span;

          return evaluationData;
        },

        afterEvaluation: (context, evaluationData, evaluationDetail) => {
          // Update span with result
          const span = evaluationData._span;
          if (span) {
            span.setAttributes({
              'launchdarkly.flag.value': String(evaluationDetail.value),
              'launchdarkly.variation.index': evaluationDetail.variationIndex ?? -1,
            });
            span.end();
          }

          this.metrics.evaluationCount++;
          console.log(`   ✓ Value: ${evaluationDetail.value} [trace recorded]\n`);

          return evaluationData;
        },

        beforeIdentify: (context, identifyData) => {
          const span = this.tracer?.startSpan('ld:user:identify', {
            attributes: {
              'launchdarkly.user.key': identifyData.key,
              'launchdarkly.user.name': identifyData.name ?? 'unknown',
            },
          });

          console.log(`👤 [TRACE] User identification: ${identifyData.key}`);
          identifyData._span = span;

          return identifyData;
        },

        afterIdentify: (context, identifyData, result) => {
          const span = identifyData._span;
          if (span) {
            span.end();
          }

          console.log(`   ✓ Identified [trace recorded]\n`);

          return identifyData;
        },

        afterTrack: (context, eventKey, data) => {
          const span = this.tracer?.startSpan('ld:event:track', {
            attributes: {
              'launchdarkly.event.key': eventKey,
              'launchdarkly.user.key': context.key,
            },
          });

          this.metrics.eventCount++;

          console.log(`📍 [TRACE] Event tracked: ${eventKey}`);
          if (data) {
            console.log(`   Data: ${JSON.stringify(data)}`);
          }

          if (span) {
            span.end();
          }

          console.log(`   ✓ Event span recorded\n`);
        },
      },
    ];
  }

  /**
   * Print telemetry report
   */
  printTelemetryReport() {
    const uptime = Date.now() - this.metrics.startTime;

    console.log('\n' + '='.repeat(70));
    console.log('📊 OPENTELEMETRY TELEMETRY REPORT');
    console.log('='.repeat(70));

    console.log(`\n🏠 Service: ${this.serviceName}`);
    console.log(`📤 OTLP Exporter: ${this.otelEndpoint}`);
    console.log(`⏱️  Uptime: ${(uptime / 1000).toFixed(2)}s`);

    console.log(`\n📈 Spans Generated:`);
    console.log(`   • Flag Evaluations: ${this.metrics.evaluationCount}`);
    console.log(`   • Events Tracked: ${this.metrics.eventCount}`);
    console.log(`   • Total Spans: ${this.metrics.evaluationCount + this.metrics.eventCount + 1}`);

    console.log(`\n📤 Telemetry Data:`);
    console.log(`   • Traces: Being exported to ${this.otelEndpoint}`);
    console.log(`   • Metrics: Enabled via OpenTelemetry SDK`);
    console.log(`   • Logs: Can be integrated via Pino/Winston + OTel`);

    console.log(`\n💡 Integration Points:`);
    console.log(`   • APM Tools: Jaeger, Datadog, New Relic, etc.`);
    console.log(`   • Observability Platforms: Grafana, Splunk, etc.`);
    console.log(`   • Data Lakes: Collect and analyze at scale`);

    console.log('\n' + '='.repeat(70) + '\n');
  }
}

async function main() {
  const environmentId = 'YOUR_ENVIRONMENT_ID';
  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  // Initialize OpenTelemetry SDK
  console.log('🚀 Initializing OpenTelemetry...\n');

  const otelResource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'ld-observability-example',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      environment: 'development',
    }),
  );

  const otelSdk = new NodeSDK({
    resource: otelResource,
    traceExporter: new OTLPTraceExporter({
      url: `${otelEndpoint}/v1/traces`,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    await otelSdk.start();
    console.log(`✅ OpenTelemetry initialized`);
    console.log(`   Exporter: OTLP (${otelEndpoint})\n`);
  } catch (error) {
    console.error('❌ OpenTelemetry initialization failed:', error);
    process.exit(1);
  }

  const userContext = {
    kind: 'user',
    key: 'observability-user-123',
    name: 'Observability Example User',
    custom: {
      plan: 'premium',
      region: 'us-west',
    },
  };

  // Create OpenTelemetry plugin for LaunchDarkly
  const otelPlugin = new OpenTelemetryPlugin({
    serviceName: 'ld-observability-example',
    otelEndpoint: otelEndpoint,
  });

  console.log('🚀 Initializing LaunchDarkly client with OpenTelemetry...\n');

  // Initialize client with OpenTelemetry plugin
  const client = init(environmentId, userContext, {
    plugins: [otelPlugin],
  });

  try {
    // Wait for initialization
    console.log('⏳ Waiting for client initialization...');
    await client.waitForInitialization();
    console.log('✅ Client initialized\n');

    // Evaluate feature flags (each creates a trace span)
    console.log('🎯 Evaluating feature flags:\n');
    const premiumFeatures = client.variation('premium-features', false);
    const betaAccess = client.variation('beta-access', false);
    const analyticsEnabled = client.variation('analytics-enabled', true);
    const darkMode = client.variation('dark-mode', false);

    // Re-evaluate flags (demonstrates multiple spans per flag)
    console.log('🔄 Re-evaluating flags...\n');
    client.variation('premium-features', false);
    client.variation('analytics-enabled', true);

    // Track events (each creates a trace span)
    console.log('📍 Tracking custom events:\n');
    client.track('feature-viewed', { featureName: 'dashboard' });
    client.track('user-action', { action: 'button-click', value: 42 });
    client.track('page-loaded', { page: '/home', loadTime: 234 });

    // Identify new user (creates a span)
    console.log('👤 Switching user context:\n');
    await client.identify({
      kind: 'user',
      key: 'observability-user-456',
      name: 'Another User',
      custom: {
        plan: 'free',
      },
    });

    // Evaluate flags for new user
    console.log('🎯 Evaluating flags for new user:\n');
    const newUserPremium = client.variation('premium-features', false);
    client.track('feature-viewed', { featureName: 'limited' });

    // Print telemetry report
    otelPlugin.printTelemetryReport();

    console.log('✨ Observability example completed!\n');

    // Allow time for spans to be exported
    console.log('⏳ Waiting for telemetry export...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  } finally {
    console.log('🛑 Closing client...');
    await client.close();

    console.log('🛑 Shutting down OpenTelemetry...');
    await otelSdk.shutdown();
    console.log('✅ OpenTelemetry shutdown complete');
  }
}

main();
