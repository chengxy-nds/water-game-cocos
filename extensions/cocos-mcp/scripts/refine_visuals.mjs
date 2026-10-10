import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  // Execute in scene context directly
  const scriptCode = 
    const scene = cc.director.getScene();
    const canvas = scene.getChildByName('Canvas');
    if (!canvas) return 'No Canvas';

    // 1. Clean up default " button\ labels under footer buttons
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
 // Bottle colors mapping
 const colorsMap = {
 'Tube_0': [new cc.Color(234, 179, 8, 255), new cc.Color(132, 204, 22, 255)], // Yellow, Green
 'Tube_1': [new cc.Color(132, 204, 22, 255), new cc.Color(37, 99, 235, 255)], // Green, Blue
 'Tube_2': [new cc.Color(37, 99, 235, 255), new cc.Color(168, 85, 247, 255)], // Blue, Purple
 'Tube_3': [new cc.Color(132, 204, 22, 255)], // Green
 'Tube_4': [new cc.Color(220, 38, 38, 255), new cc.Color(168, 85, 247, 255)], // Red, Purple
 'Tube_6': [new cc.Color(220, 38, 38, 255), new cc.Color(234, 179, 8, 255)], // Red, Yellow
 'Tube_7': [new cc.Color(220, 38, 38, 255), new cc.Color(168, 85, 247, 255)], // Red, Purple
 'Tube_8': [new cc.Color(220, 38, 38, 255), new cc.Color(37, 99, 235, 255)], // Red, Blue
 'Tube_9': [new cc.Color(168, 85, 247, 255), new cc.Color(37, 99, 235, 255)] // Purple, Blue
 };

 for (const tubeNode of gameBoard.children) {
 const colors = colorsMap[tubeNode.name];
 if (!colors) continue;

 // Find and style liquid layers
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
 // Y offset: bottom aligned inside tube
 lNode.setPosition(0, -48 + idx * 26, 0);
 });
 }
 }

 return 'Refined successfully!';
 ;

 const res = await client.callTool({
 name: 'execute_scene_code',
 arguments: {
 code: scriptCode,
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
