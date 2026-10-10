import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  // 1. Create Level Label in Header
  const headerRes = await client.callTool({
    name: 'create_nodes',
    arguments: {
      parentUuid: 'ad4L8Oa5xFzbLEOXfMqukx', // Header
      nodes: [
        { name: 'LevelLabel', type: '2D/Label' }
      ]
    }
  });
  console.log('Header elements created:', headerRes.content[0].text);

  // 2. Create 4 Shopping Bags placeholders
  const bagsRes = await client.callTool({
    name: 'create_nodes',
    arguments: {
      parentUuid: '7aUMFy52BC07SQjf05DVQ1', // ShoppingBags
      nodes: [
        { name: 'Bag_1_Yellow', type: '2D/SpriteSplash' },
        { name: 'Bag_2_Purple', type: '2D/SpriteSplash' },
        { name: 'Bag_3_Blue', type: '2D/SpriteSplash' },
        { name: 'Bag_4_Video', type: '2D/SpriteSplash' }
      ]
    }
  });
  console.log('Shopping bags created:', bagsRes.content[0].text);

  // 3. Create Shuffle and Undo Buttons in Footer
  const footerRes = await client.callTool({
    name: 'create_nodes',
    arguments: {
      parentUuid: '0ck2gS1FRHVb8AilKWU7Uv', // Footer
      nodes: [
        { name: 'BtnShuffle', type: 'UI/Button (with Label)' },
        { name: 'BtnUndo', type: 'UI/Button (with Label)' }
      ]
    }
  });
  console.log('Footer buttons created:', footerRes.content[0].text);

  // Save scene
  await client.callTool({
    name: 'operate_current_scene',
    arguments: { operation: 'save' }
  });
  console.log('Scene saved successfully!');

  await client.close();
}

main().catch(console.error);
