import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const canvasUuid = 'a0XRZA4aBBg5xRBsl3lum4';

  const res = await client.callTool({
    name: 'create_nodes',
    arguments: {
      parentUuid: canvasUuid,
      nodes: [
        { name: 'Background', type: '2D/SpriteSplash' },
        { name: 'Header', type: 'Empty' },
        { name: 'ShoppingBags', type: 'Empty' },
        { name: 'GameBoard', type: 'Empty' },
        { name: 'WaterStream', type: '2D/Graphics' },
        { name: 'Footer', type: 'Empty' }
      ]
    }
  });

  console.log('Result:', res.content[0].text);

  await client.close();
}

main().catch(console.error);
