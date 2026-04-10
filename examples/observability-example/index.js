/**
 * Observability Example: unofficial-ld-node-client-sdk
 *
 * This example demonstrates:
 * 1. Initializing the LaunchDarkly client
 * 2. Creating and registering an observability plugin
 * 3. Evaluating feature flags with telemetry tracking
 * 4. Monitoring flag evaluations and events
 * 5. Viewing observability metrics
 */

import { init } from 'unofficial-ld-node-client-sdk';

/**
 * Example Observability Plugin
 *
 * This plugin demonstrates how to hook into SDK events
 * to collect telemetry and monitoring data.
 */
class ObservabilityPlugin {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'ld-app';
    this.environment = options.environment || 'development';
    this.metrics = {
      evaluationCount: 0,
      evaluationsByFlag: {},
      eventCount: 0,
      eventsByType: {},
      identifyCount: 0,
      startTime: Date.now(),
    };
  }

  getMetadata() {
    return {
      name: 'observability-plugin',
      version: '1.0.0',
    };
  }

  register(client, metadata) {
    console.log('📊 Observability Plugin registered');
    console.log(`   Service: ${this.serviceName}`);
    console.log(`   Environment: ${this.environment}`);
    console.log(`   Client-side ID: ${metadata.clientSideId}\n`);
  }

  getHooks() {
    return [
      {
        getMetadata: () => ({ name: 'observability-hook' }),

        beforeEvaluation: (context, evaluationData) => {
          console.log(`📈 [EVAL] Flag: ${evaluationData.key}`);
          return evaluationData;
        },

        afterEvaluation: (context, evaluationData, evaluationDetail) => {
          // Track evaluation metrics
          this.metrics.evaluationCount++;

          if (!this.metrics.evaluationsByFlag[evaluationData.key]) {
            this.metrics.evaluationsByFlag[evaluationData.key] = {
              count: 0,
              values: {},
            };
          }

          this.metrics.evaluationsByFlag[evaluationData.key].count++;
          const valueStr = String(evaluationDetail.value);
          this.metrics.evaluationsByFlag[evaluationData.key].values[valueStr] =
            (this.metrics.evaluationsByFlag[evaluationData.key].values[valueStr] || 0) + 1;

          console.log(`   ✓ Value: ${evaluationDetail.value} (user: ${context.key})`);

          return evaluationData;
        },

        beforeIdentify: (context, identifyData) => {
          console.log(`👤 [IDENTIFY] User: ${identifyData.key}`);
          this.metrics.identifyCount++;
          return identifyData;
        },

        afterIdentify: (context, identifyData, result) => {
          console.log(`   ✓ Identified successfully\n`);
          return identifyData;
        },

        afterTrack: (context, eventKey, data) => {
          // Track event metrics
          this.metrics.eventCount++;

          if (!this.metrics.eventsByType[eventKey]) {
            this.metrics.eventsByType[eventKey] = 0;
          }
          this.metrics.eventsByType[eventKey]++;

          console.log(`📍 [EVENT] ${eventKey} (user: ${context.key})`);
          if (data) {
            console.log(`   Data: ${JSON.stringify(data)}\n`);
          }
        },
      },
    ];
  }

  /**
   * Get collected metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      uptime: `${(uptime / 1000).toFixed(2)}s`,
      evaluations: {
        total: this.metrics.evaluationCount,
        byFlag: this.metrics.evaluationsByFlag,
      },
      events: {
        total: this.metrics.eventCount,
        byType: this.metrics.eventsByType,
      },
      identifies: this.metrics.identifyCount,
    };
  }

  /**
   * Print metrics report
   */
  printMetrics() {
    const metrics = this.getMetrics();

    console.log('\n' + '='.repeat(60));
    console.log('📊 OBSERVABILITY METRICS REPORT');
    console.log('='.repeat(60));

    console.log(`\n⏱️  Uptime: ${metrics.uptime}`);

    console.log(`\n📈 Flag Evaluations: ${metrics.evaluations.total}`);
    for (const [flagKey, data] of Object.entries(metrics.evaluations.byFlag)) {
      console.log(`   • ${flagKey}: ${data.count} evaluations`);
      for (const [value, count] of Object.entries(data.values)) {
        console.log(`     - ${value}: ${count}x`);
      }
    }

    console.log(`\n📍 Events: ${metrics.events.total}`);
    for (const [eventType, count] of Object.entries(metrics.events.byType)) {
      console.log(`   • ${eventType}: ${count}x`);
    }

    console.log(`\n👤 User Identifications: ${metrics.identifies}`);

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

async function main() {
  const clientSideId = 'YOUR_CLIENT_SIDE_ID';

  const userContext = {
    kind: 'user',
    key: 'observability-user-123',
    name: 'Observability Example User',
    custom: {
      plan: 'premium',
      region: 'us-west',
    },
  };

  // Create observability plugin
  const observabilityPlugin = new ObservabilityPlugin({
    serviceName: 'ld-observability-app',
    environment: 'production',
  });

  console.log('🚀 Initializing LaunchDarkly client with observability...\n');

  // Initialize client with observability plugin
  const client = init(clientSideId, userContext, {
    plugins: [observabilityPlugin],
  });

  try {
    // Wait for initialization
    console.log('⏳ Waiting for client initialization...');
    await client.waitForInitialization();
    console.log('✅ Client initialized\n');

    // Simulate flag evaluations
    console.log('🎯 Evaluating feature flags:\n');
    const premiumFeatures = client.variation('premium-features', false);
    const betaAccess = client.variation('beta-access', false);
    const analyticsEnabled = client.variation('analytics-enabled', true);
    const darkMode = client.variation('dark-mode', false);

    // Simulate re-evaluations (common in production)
    console.log('🔄 Re-evaluating flags...\n');
    client.variation('premium-features', false);
    client.variation('analytics-enabled', true);

    // Simulate event tracking
    console.log('📍 Tracking custom events:\n');
    client.track('feature-viewed', { featureName: 'dashboard' });
    client.track('user-action', { action: 'button-click', value: 42 });
    client.track('page-loaded', { page: '/home', loadTime: 234 });

    // Simulate identifying a new user
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

    // Print observability metrics
    observabilityPlugin.printMetrics();

    console.log('✨ Observability example completed!\n');
  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  } finally {
    console.log('🛑 Closing client...');
    await client.close();
    console.log('✅ Client closed');
  }
}

main();
