import { Client } from '@modelcontextprotocol/sdk/dist/esm/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  // Directly call execute_scene_code
  const sceneScript = `
    const scene = cc.director.getScene();
    const canvas = scene.getChildByName('Canvas');
    if (!canvas) return 'No Canvas';

    // 1. Clean up default button labels under footer buttons
    const footer = canvas.getChildByName('Footer');
    if (footer) {
      footer.walk((n) => {
        const lbl = n.getComponent(cc.Label);
        if (lbl) {
          lbl.string = '';
        }
      });
    }

    // 2. Refine all liquid layers in GameBoard
    const gameBoard = canvas.getChildByName('GameBoard');
    if (gameBoard) {
      const colorsMap = {
        'Tube_0': [new cc.Color(234, 179, 8, 255), new cc.Color(132, 204, 22, 255)],
        'Tube_1': [new cc.Color(132, 204, 22, 255), new cc.Color(37, 99, 235, 255)],
        'Tube_2': [new cc.Color(37, 99, 235, 255), new cc.Color(168, 85, 247, 255)],
        'Tube_3': [new cc.Color(132, 204, 22, 255)],
        'Tube_4': [new cc.Color(220, 38, 38, 255), new cc.Color(168, 85, 247, 255)],
        'Tube_6': [new cc.Color(220, 38, 38, 255), new cc.Color(234, 179, 8, 255)],
        'Tube_7': [new cc.Color(220, 38, 38, 255), new cc.Color(168, 85, 247, 255)],
        'Tube_8': [new cc.Color(220, 38, 38, 255), new cc.Color(37, 99, 235, 255)],
        'Tube_9': [new cc.Color(168, 85, 247, 255), new cc.Color(37, 99, 235, 255)]
      };

      for (const tubeNode of gameBoard.children) {
        const colors = colorsMap[tubeNode.name];
        if (!colors) continue;

        const liquids = tubeNode.children.filter(c => c.name.startsWith('Liquid_'));
        liquids.forEach((lNode, idx) => {
          const trans = lNode.getComponent(cc.UITransform);
          if (trans) {
            trans.setContentSize(46, 26);
          }
          const sp = lNode.getComponent(cc.Sprite);
          if (sp && colors[idx]) {
            sp.color = colors[idx];
          }
          lNode.setPosition(0, -48 + idx * 26, 0);
        });
      }
    }

    return 'Refined successfully!';
  `;

  const res = await client.callTool({
    name: 'execute_scene_code',
    arguments: {
      code: sceneScript,
      context: { returnResult: true }
    }
  });

  console.log('Execute scene code result:', res.content[0].text);

  // Save Scene
  await client.callTool({
    name: 'operate_current_scene',
    arguments: { operation: 'save' }
  });
  console.log('Scene saved after refining visuals!');

  await client.close();
}

main().catch(console.error);
