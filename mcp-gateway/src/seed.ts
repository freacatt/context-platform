import { db } from './firebase.js';
import crypto from 'crypto';

async function seed() {
  const workspaceId = 'test-workspace-' + Date.now();
  const secret = 'sk-mcp-test-123';
  const hash = crypto.createHash('sha256').update(secret).digest('hex');

  console.log(`Creating settings for workspace: ${workspaceId}`);

  await db.collection('workspace_mcp_settings').add({
    workspaceId,
    userId: 'test-user',
    enabled: true,
    allowedTools: ['read_global_context', 'search_resources', 'read_resource'],
    exposeDocuments: true,
    maxContextSize: 1000,
    accessKeys: [{
        id: 'key-1',
        hashedKey: hash,
        label: 'Test Key',
        createdAt: new Date().toISOString()
    }]
  });

  // Create a dummy resource
  const docRef = await db.collection('contextDocuments').add({
    workspaceId,
    title: 'Test Document for MCP',
    content: 'This is the secret content of the test document.',
    createdAt: new Date().toISOString()
  });

  // Create workspace doc
  await db.collection('workspaces').doc(workspaceId).set({
      globalContextSources: []
  });

  console.log('Seeded successfully.');
  console.log(`Workspace ID: ${workspaceId}`);
  console.log(`Key: ${secret}`);
  console.log(`Doc ID: ${docRef.id}`);
  process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
