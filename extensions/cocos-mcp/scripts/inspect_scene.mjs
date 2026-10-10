import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const res = await client.callTool({
    name: 'query_nodes',
    arguments: { depth: 3, includeComponents: true }
  });
  console.log(res.content[0].text);

  await client.close();
}

main().catch(console.error);
