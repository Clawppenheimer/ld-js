/**
 * Hello World Example: unofficial-ld-node-client-sdk
 *
 * This example demonstrates:
 * 1. Initializing the LaunchDarkly client
 * 2. Creating a user context
 * 3. Evaluating feature flags
 * 4. Logging flag values
 */

import { init } from 'unofficial-ld-node-client-sdk';

async function main() {
  // Initialize the client with a client-side ID
  // Note: In a real application, use your actual client-side ID
  const clientSideId = 'YOUR_CLIENT_SIDE_ID';

  // Create a user context
  const userContext = {
    kind: 'user',
    key: 'user-123',
    name: 'Example User',
    email: 'user@example.com',
  };

  console.log('🚀 Initializing LaunchDarkly client...');
  const client = init(clientSideId, userContext);

  try {
    // Wait for the client to initialize and connect
    console.log('⏳ Waiting for client initialization...');
    await client.waitForInitialization();
    console.log('✅ Client initialized successfully!');

    // Evaluate feature flags
    console.log('\n📊 Evaluating feature flags:\n');

    // Example flag 1: Boolean flag
    const newFeatureEnabled = client.variation('new-feature', false);
    console.log(`  • new-feature: ${newFeatureEnabled}`);

    // Example flag 2: String flag
    const userTheme = client.variation('user-theme', 'light');
    console.log(`  • user-theme: ${userTheme}`);

    // Example flag 3: Number flag
    const maxRetries = client.variation('max-retries', 3);
    console.log(`  • max-retries: ${maxRetries}`);

    // Example flag 4: JSON flag
    const featureConfig = client.variation('feature-config', { enabled: false });
    console.log(`  • feature-config: ${JSON.stringify(featureConfig)}`);

    // Track a custom event
    console.log('\n📈 Tracking custom event...');
    client.track('hello-world-completed', { timestamp: new Date().toISOString() });
    console.log('✅ Event tracked');

    // Identify as a different user
    console.log('\n👤 Identifying as different user...');
    await client.identify({
      kind: 'user',
      key: 'user-456',
      name: 'Another User',
    });
    console.log('✅ User identified');

    // Evaluate flags for the new user
    const newUserFeature = client.variation('new-feature', false);
    console.log(`  • new-feature (for user-456): ${newUserFeature}`);

    console.log('\n✨ Hello World example completed!\n');
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
