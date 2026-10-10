import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  // 1. Position bags and buttons
  await client.callTool({
    name: 'modify_nodes',
    arguments: {
      nodes: [
        { uuid: 'dchGsy7VRORrUHlu7VArbA', properties: { position: { x: -180, y: 0, z: 0 } } }, // Bag 1
        { uuid: '61lj58dgxAU7N0hKoQsP/g', properties: { position: { x: -60, y: 0, z: 0 } } },  // Bag 2
        { uuid: '12P5mRlr1GCbjZ98Lb5UJ2', properties: { position: { x: 60, y: 0, z: 0 } } },   // Bag 3
        { uuid: '4eIddzwWdGDKvtySoWcBt3', properties: { position: { x: 180, y: 0, z: 0 } } },  // Bag 4
        { uuid: '8fZY7QuWxN4pqth3eSXr4H', properties: { position: { x: -120, y: 0, z: 0 } } }, // BtnShuffle
        { uuid: '44bUpp8UVAf7KYmYJAN+iC', properties: { position: { x: 120, y: 0, z: 0 } } }   // BtnUndo
      ]
    }
  });

  // 2. Set Bag sizes and colors
  const bagSize = { width: 95, height: 130 };
  await client.callTool({
    name: 'modify_components',
    arguments: {
      components: [
        // Level Label text
        {
          uuid: '07IR8Ir9FDLppbNldrKUdW',
          properties: [
            { path: 'string', type: 'String', value: 'ตฺ 2 นุ' },
            { path: 'fontSize', type: 'Number', value: 34 }
          ]
        },
        // Bag 1 (Yellow)
        {
          uuid: '64dDgWoTlM4K2Dk9XYzOxT',
          properties: [
            { path: 'contentSize.width', type: 'Number', value: bagSize.width },
            { path: 'contentSize.height', type: 'Number', value: bagSize.height }
          ]
        },
        {
          uuid: '73yp8sqIBIeoxo7sW/ZxCz',
          properties: [
            { path: 'color.r', type: 'Number', value: 255 },
            { path: 'color.g', type: 'Number', value: 199 },
            { path: 'color.b', type: 'Number', value: 0 },
            { path: 'color.a', type: 'Number', value: 230 }
          ]
        },
        // Bag 2 (Purple)
        {
          uuid: '2fJ5OjnL9OIri4NvFmjNYh',
          properties: [
            { path: 'contentSize.width', type: 'Number', value: bagSize.width },
            { path: 'contentSize.height', type: 'Number', value: bagSize.height }
          ]
        },
        {
          uuid: 'cfi6grLWxEsLPQ8pSSQ5JJ',
          properties: [
            { path: 'color.r', type: 'Number', value: 162 },
            { path: 'color.g', type: 'Number', value: 54 },
            { path: 'color.b', type: 'Number', value: 223 },
            { path: 'color.a', type: 'Number', value: 230 }
          ]
        },
        // Bag 3 (Blue)
        {
          uuid: '6buOUk4hpGFID17QwGMsFr',
          properties: [
            { path: 'contentSize.width', type: 'Number', value: bagSize.width },
            { path: 'contentSize.height', type: 'Number', value: bagSize.height }
          ]
        },
        {
          uuid: '8cvkrfe1lGj7PfbZRKZQmS',
          properties: [
            { path: 'color.r', type: 'Number', value: 33 },
            { path: 'color.g', type: 'Number', value: 88 },
            { path: 'color.b', type: 'Number', value: 234 },
            { path: 'color.a', type: 'Number', value: 230 }
          ]
        },
        // Bag 4 (Video / Gray-White)
        {
          uuid: 'd0L5bkOUFLSIjqkmLOnBvz',
          properties: [
            { path: 'contentSize.width', type: 'Number', value: bagSize.width },
            { path: 'contentSize.height', type: 'Number', value: bagSize.height }
          ]
        },
        {
          uuid: '51FXVyT4tLprywUAKD/wQ5',
          properties: [
            { path: 'color.r', type: 'Number', value: 220 },
            { path: 'color.g', type: 'Number', value: 230 },
            { path: 'color.b', type: 'Number', value: 240 },
            { path: 'color.a', type: 'Number', value: 230 }
          ]
        },
        // BtnShuffle (size & color)
        {
          uuid: 'ebmmq/EztLgrSXBouCG8nV',
          properties: [
            { path: 'contentSize.width', type: 'Number', value: 130 },
            { path: 'contentSize.height', type: 'Number', value: 70 }
          ]
        },
        {
          uuid: 'be76O/MX9DYZdMgIykMdju',
          properties: [
            { path: 'color.r', type: 'Number', value: 37 },
            { path: 'color.g', type: 'Number', value: 99 },
            { path: 'color.b', type: 'Number', value: 235 },
            { path: 'color.a', type: 'Number', value: 255 }
          ]
        },
        // BtnUndo (size & color)
        {
          uuid: 'cdMPsYYqxI2LkA3KBGcW6W',
          properties: [
            { path: 'contentSize.width', type: 'Number', value: 130 },
            { path: 'contentSize.height', type: 'Number', value: 70 }
          ]
        },
        {
          uuid: 'b3m3KY2g5KcKadN0hjAuQ6',
          properties: [
            { path: 'color.r', type: 'Number', value: 56 },
            { path: 'color.g', type: 'Number', value: 189 },
            { path: 'color.b', type: 'Number', value: 248 },
            { path: 'color.a', type: 'Number', value: 255 }
          ]
        }
      ]
    }
  });

  // Save scene
  await client.callTool({
    name: 'operate_current_scene',
    arguments: { operation: 'save' }
  });
  console.log('UI styles and scene saved successfully!');

  await client.close();
}

main().catch(console.error);
