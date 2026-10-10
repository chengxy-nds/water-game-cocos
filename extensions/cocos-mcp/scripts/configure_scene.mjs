import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const res = await client.callTool({
    name: 'modify_nodes',
    arguments: {
      nodes: [
        {
          uuid: '10BwW9fVpGDrNX9Cf+gj8L', // Background
          properties: { position: { x: 0, y: 0, z: 0 } }
        },
        {
          uuid: 'ad4L8Oa5xFzbLEOXfMqukx', // Header
          properties: { position: { x: 0, y: 560, z: 0 } }
        },
        {
          uuid: '7aUMFy52BC07SQjf05DVQ1', // ShoppingBags
          properties: { position: { x: 0, y: 420, z: 0 } }
        },
        {
          uuid: '49ynTaCUVO17HgKubzrf+h', // GameBoard
          properties: { position: { x: 0, y: -30, z: 0 } }
        },
        {
          uuid: '58XMNnFOFA9rVg04B76Z1y', // WaterStream
          properties: { position: { x: 0, y: 0, z: 0 } }
        },
        {
          uuid: '0ck2gS1FRHVb8AilKWU7Uv', // Footer
          properties: { position: { x: 0, y: -530, z: 0 } }
        }
      ]
    }
  });

  console.log('Modify nodes result:', res.content[0].text);

  // Set Background contentSize and color via execute_scene_code or modify_components
  const bgTransformUuid = '81SaiWUDlPJpu9x/ndyJvQ';
  const bgSpriteUuid = '62QiAAMulOnbuINtx7AWr6';

  await client.callTool({
    name: 'modify_components',
    arguments: {
      components: [
        {
          uuid: bgTransformUuid,
          properties: [
            { path: 'contentSize.width', type: 'Number', value: 750 },
            { path: 'contentSize.height', type: 'Number', value: 1334 }
          ]
        },
        {
          uuid: bgSpriteUuid,
          properties: [
            { path: 'color.r', type: 'Number', value: 11 },
            { path: 'color.g', type: 'Number', value: 19 },
            { path: 'color.b', type: 'Number', value: 43 },
            { path: 'color.a', type: 'Number', value: 255 }
          ]
        }
      ]
    }
  });

  console.log('Configured background size (750x1334) and deep navy color!');

  await client.close();
}

main().catch(console.error);
