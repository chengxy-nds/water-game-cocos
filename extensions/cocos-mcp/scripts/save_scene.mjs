import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const res = await client.callTool({
    name: 'operate_current_scene',
    arguments: { operation: 'save' }
  });
  console.log('Scene saved:', res.content[0].text);

  await client.close();
}

main().catch(console.error);
