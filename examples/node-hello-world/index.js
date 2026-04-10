/**
 * Hello World Example: unofficial-ld-node-client-sdk
 *
 * This example demonstrates:
 * 1. Initializing the LaunchDarkly client with environment ID
 * 2. Requesting feature flags from the SDK
 * 3. Evaluating feature flags in code
 * 4. Logging flag names and values to console
 * 5. Showing real-time updates when flags change
 */

import { init } from 'unofficial-ld-node-client-sdk';

async function main() {
  // Initialize the client with your LaunchDarkly environment ID (client-side)
  // Get this from your LaunchDarkly project settings
  const environmentId = 'YOUR_ENVIRONMENT_ID';

  // Create a user context
  const userContext = {
    kind: 'user',
    key: 'example-user-123',
    name: 'Example User',
    email: 'user@example.com',
  };

  console.log('🚀 Initializing LaunchDarkly client...');
  console.log(`   Environment: ${environmentId}`);
  console.log(`   User: ${userContext.name} (${userContext.key})\n`);

  const client = init(environmentId, userContext);

  try {
    // Request feature flags from the SDK and wait for initialization
    console.log('⏳ Requesting feature flags from LaunchDarkly...');
    await client.waitForInitialization();
    console.log('✅ Client initialized and ready!\n');

    // Evaluate feature flags
    console.log('📊 Current feature flag values:\n');

    const flags = [
      { key: 'new-feature', default: false },
      { key: 'user-theme', default: 'light' },
      { key: 'max-retries', default: 3 },
      { key: 'feature-config', default: { enabled: false } },
    ];

    flags.forEach(({ key, default: defaultValue }) => {
      const value = client.variation(key, defaultValue);
      console.log(`  • ${key}: ${JSON.stringify(value)}`);
    });

    // Listen for real-time flag updates
    console.log('\n🔄 Listening for real-time flag updates...');
    client.on('change', (context) => {
      console.log('\n🔔 Flag change detected!');
      flags.forEach(({ key, default: defaultValue }) => {
        const value = client.variation(key, defaultValue);
        console.log(`  • ${key}: ${JSON.stringify(value)}`);
      });
    });

    // Simulate a flag update scenario (in real app, would come from LD)
    console.log('   (Waiting for updates from LaunchDarkly...)');

    // Track a custom event
    console.log('\n📈 Tracking custom event...');
    client.track('hello-world-completed', {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
    console.log('✅ Event tracked');

    // Demonstrate user context changes
    console.log('\n👤 Identifying as different user...');
    await client.identify({
      kind: 'user',
      key: 'example-user-456',
      name: 'Another User',
      email: 'another@example.com',
    });
    console.log('✅ User identified');

    // Evaluate flags for the new user
    console.log('\n📊 Feature flags for new user:\n');
    flags.forEach(({ key, default: defaultValue }) => {
      const value = client.variation(key, defaultValue);
      console.log(`  • ${key}: ${JSON.stringify(value)}`);
    });

    console.log('\n✨ Hello World example completed!\n');

    // Keep running for 5 seconds to listen for updates
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('❌ Error during execution:', error);
    process.exit(1);
  } finally {
    // Always close the client to clean up resources
    console.log('🛑 Closing client...');
    await client.close();
    console.log('✅ Client closed');
  }
}

main();
