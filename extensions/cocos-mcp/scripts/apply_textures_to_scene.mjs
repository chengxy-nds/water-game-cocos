import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  // Texture SpriteFrame UUIDs
  const bgFrameUuid = 'NjY4ZTg3YmEtY2U1OC00MDU4LTgyZTEtMDgwZDE3OWUwMmFhQGY5OTQx';
  const bagFrameUuid = 'Y2Q3ZDVmMzAtMTE3NC00NmJlLTk1NjYtODcyMDRhNjRkYzY1QGY5OTQx';
  const shuffleFrameUuid = 'YjU5MWQ4OTgtNGM0MC00NzZiLWIyODAtNTM2ZmE5YzBkNWI1QGY5OTQx';
  const undoFrameUuid = 'M2YyNjc2MjctODhjMS00YmM2LWE0YmEtZDJkY2NmYmEyMDkwQGY5OTQx';

  // Component UUIDs from our previous creation:
  // Background Sprite: 62QiAAMulOnbuINtx7AWr6
  // Bag 1 Sprite: 73yp8sqIBIeoxo7sW/ZxCz
  // Bag 2 Sprite: cfi6grLWxEsLPQ8pSSQ5JJ
  // Bag 3 Sprite: 8cvkrfe1lGj7PfbZRKZQmS
  // Bag 4 Sprite: 51FXVyT4tLprywUAKD/wQ5
  // BtnShuffle Sprite: be76O/MX9DYZdMgIykMdju
  // BtnUndo Sprite: b3m3KY2g5KcKadN0hjAuQ6

  const res = await client.callTool({
    name: 'modify_components',
    arguments: {
      components: [
        // 1. Background
        {
          uuid: '62QiAAMulOnbuINtx7AWr6',
          properties: [
            { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: bgFrameUuid } },
            { path: 'color.r', type: 'Number', value: 255 },
            { path: 'color.g', type: 'Number', value: 255 },
            { path: 'color.b', type: 'Number', value: 255 },
            { path: 'color.a', type: 'Number', value: 255 }
          ]
        },
        // 2. Shopping Bags (apply shopping_bag.png)
        {
          uuid: '73yp8sqIBIeoxo7sW/ZxCz', // Bag 1 (Yellow)
          properties: [
            { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: bagFrameUuid } },
            { path: 'color.r', type: 'Number', value: 255 },
            { path: 'color.g', type: 'Number', value: 215 },
            { path: 'color.b', type: 'Number', value: 0 }
          ]
        },
        {
          uuid: 'cfi6grLWxEsLPQ8pSSQ5JJ', // Bag 2 (Purple)
          properties: [
            { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: bagFrameUuid } },
            { path: 'color.r', type: 'Number', value: 200 },
            { path: 'color.g', type: 'Number', value: 100 },
            { path: 'color.b', type: 'Number', value: 240 }
          ]
        },
        {
          uuid: '8cvkrfe1lGj7PfbZRKZQmS', // Bag 3 (Blue)
          properties: [
            { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: bagFrameUuid } },
            { path: 'color.r', type: 'Number', value: 80 },
            { path: 'color.g', type: 'Number', value: 140 },
            { path: 'color.b', type: 'Number', value: 255 }
          ]
        },
        {
          uuid: '51FXVyT4tLprywUAKD/wQ5', // Bag 4 (Video)
          properties: [
            { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: bagFrameUuid } },
            { path: 'color.r', type: 'Number', value: 255 },
            { path: 'color.g', type: 'Number', value: 255 },
            { path: 'color.b', type: 'Number', value: 255 }
          ]
        },
        // 3. Footer 3D Crystal Buttons
        {
          uuid: 'be76O/MX9DYZdMgIykMdju', // BtnShuffle
          properties: [
            { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: shuffleFrameUuid } },
            { path: 'color.r', type: 'Number', value: 255 },
            { path: 'color.g', type: 'Number', value: 255 },
            { path: 'color.b', type: 'Number', value: 255 }
          ]
        },
        {
          uuid: 'b3m3KY2g5KcKadN0hjAuQ6', // BtnUndo
          properties: [
            { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: undoFrameUuid } },
            { path: 'color.r', type: 'Number', value: 255 },
            { path: 'color.g', type: 'Number', value: 255 },
            { path: 'color.b', type: 'Number', value: 255 }
          ]
        }
      ]
    }
  });
  console.log('Applied textures to components:', res.content[0].text);

  // Save scene
  await client.callTool({
    name: 'operate_current_scene',
    arguments: { operation: 'save' }
  });
  console.log('Scene saved with high quality textures!');

  await client.close();
}

main().catch(console.error);
