import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  console.log('? Connected to Cocos MCP server on port 3000!');
  
  const tools = await client.listTools();
  console.log('? Available tools count:', tools.tools.length);
  tools.tools.forEach(t => console.log(' - ' + t.name));

  // Query current scene nodes
  const nodes = await client.callTool({ name: 'query_nodes', arguments: {} });
  console.log('? Current Scene Nodes:', JSON.stringify(nodes, null, 2));

  await client.close();
}

main().catch(console.error);
