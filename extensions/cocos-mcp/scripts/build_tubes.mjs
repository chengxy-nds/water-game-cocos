import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const gameBoardUuid = '49ynTaCUVO17HgKubzrf+h';
  const glassFrameUuid = 'N2I0MjJhNGQtNzZjMy00NWQ5LWJlZTctYWUyZTA4NTY0NWNhQGY5OTQx';
  const videoBadgeFrameUuid = 'M2I4NGJmZTEtZmQ5NS00ZmNjLTk3YTEtMTgzMThkNjRmMGM1QGY5OTQx';

  // Level 2 bottle color definitions matching screenshot:
  // Top 5 tubes
  const topBottles = [
    { name: 'Tube_0', colors: ['#EAB308', '#84CC16'], x: -230, y: 110 },       // Yellow, Green
    { name: 'Tube_1', colors: ['#84CC16', '#2563EB'], x: -115, y: 110 },       // Green, Blue
    { name: 'Tube_2', colors: ['#2563EB', '#A855F7'], x: 0, y: 110 },          // Blue, Purple
    { name: 'Tube_3', colors: ['#84CC16'], x: 115, y: 110 },                   // Green
    { name: 'Tube_4', colors: ['#DC2626', '#A855F7'], x: 230, y: 110 }        // Red, Purple
  ];

  // Bottom 6 tubes
  const bottomBottles = [
    { name: 'Tube_5_AdLeft', colors: [], isAd: true, x: -287.5, y: -110 },      // Left Locked Video Tube
    { name: 'Tube_6', colors: ['#DC2626', '#EAB308'], x: -172.5, y: -110 },     // Red, Yellow
    { name: 'Tube_7', colors: ['#DC2626', '#A855F7'], x: -57.5, y: -110 },      // Red, Purple
    { name: 'Tube_8', colors: ['#DC2626', '#2563EB'], x: 57.5, y: -110 },       // Red, Blue
    { name: 'Tube_9', colors: ['#A855F7', '#2563EB'], x: 172.5, y: -110 },      // Purple, Blue
    { name: 'Tube_10_AdRight', colors: [], isAd: true, x: 287.5, y: -110 }     // Right Locked Video Tube
  ];

  const allTubes = [...topBottles, ...bottomBottles];

  // 1. Create all tube container nodes under GameBoard
  const tubeNodesToCreate = allTubes.map(t => ({
    name: t.name,
    type: 'Empty'
  }));

  const createRes = await client.callTool({
    name: 'create_nodes',
    arguments: {
      parentUuid: gameBoardUuid,
      nodes: tubeNodesToCreate
    }
  });

  const createdTubes = JSON.parse(createRes.content[0].text).nodes;
  console.log(`Created ${createdTubes.length} tube containers`);

  // 2. Position all tube containers and create inner elements (Glass + Liquids + Badges)
  const positionNodesSpec = [];
  for (let i = 0; i < allTubes.length; i++) {
    const tData = allTubes[i];
    const tNode = createdTubes[i];
    positionNodesSpec.push({
      uuid: tNode.uuid,
      properties: {
        position: { x: tData.x, y: tData.y, z: 0 }
      }
    });
  }

  await client.callTool({
    name: 'modify_nodes',
    arguments: { nodes: positionNodesSpec }
  });

  // 3. For each tube, create:
  // - Liquid layers (SpriteSplash with color)
  // - Glass overlay (SpriteSplash with tube_glass.png)
  // - Video Badge (if isAd)
  for (let i = 0; i < allTubes.length; i++) {
    const tData = allTubes[i];
    const tNode = createdTubes[i];

    const childNodesToCreate = [];

    // Liquid layers bottom to top
    for (let l = 0; l < tData.colors.length; l++) {
      childNodesToCreate.push({
        name: `Liquid_${l}`,
        type: '2D/SpriteSplash'
      });
    }

    // Glass overlay (rendered on top of liquids)
    childNodesToCreate.push({
      name: 'GlassBody',
      type: '2D/SpriteSplash'
    });

    // Video Camera Badge for ad tubes
    if (tData.isAd) {
      childNodesToCreate.push({
        name: 'VideoBadge',
        type: '2D/SpriteSplash'
      });
    }

    const subRes = await client.callTool({
      name: 'create_nodes',
      arguments: {
        parentUuid: tNode.uuid,
        nodes: childNodesToCreate
      }
    });

    const subNodes = JSON.parse(subRes.content[0].text).nodes;

    // Configure components for these sub nodes
    const compsToModify = [];
    const nodesToPosition = [];

    let layerIdx = 0;
    for (const sNode of subNodes) {
      const transformUuid = sNode.components.find(c => c.type.includes('UITransform'))?.uuid;
      const spriteUuid = sNode.components.find(c => c.type.includes('Sprite'))?.uuid;

      if (sNode.name.startsWith('Liquid_')) {
        const hex = tData.colors[layerIdx];
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const yPos = -60 + layerIdx * 32;

        nodesToPosition.push({
          uuid: sNode.uuid,
          properties: { position: { x: 0, y: yPos, z: 0 } }
        });

        if (transformUuid) {
          compsToModify.push({
            uuid: transformUuid,
            properties: [
              { path: 'contentSize.width', type: 'Number', value: 50 },
              { path: 'contentSize.height', type: 'Number', value: 34 }
            ]
          });
        }
        if (spriteUuid) {
          compsToModify.push({
            uuid: spriteUuid,
            properties: [
              { path: 'color.r', type: 'Number', value: r },
              { path: 'color.g', type: 'Number', value: g },
              { path: 'color.b', type: 'Number', value: b },
              { path: 'color.a', type: 'Number', value: 245 }
            ]
          });
        }
        layerIdx++;
      } else if (sNode.name === 'GlassBody') {
        nodesToPosition.push({
          uuid: sNode.uuid,
          properties: { position: { x: 0, y: 0, z: 0 } }
        });
        if (transformUuid) {
          compsToModify.push({
            uuid: transformUuid,
            properties: [
              { path: 'contentSize.width', type: 'Number', value: 65 },
              { path: 'contentSize.height', type: 'Number', value: 160 }
            ]
          });
        }
        if (spriteUuid) {
          compsToModify.push({
            uuid: spriteUuid,
            properties: [
              { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: glassFrameUuid } },
              { path: 'color.r', type: 'Number', value: 255 },
              { path: 'color.g', type: 'Number', value: 255 },
              { path: 'color.b', type: 'Number', value: 255 },
              { path: 'color.a', type: 'Number', value: 255 }
            ]
          });
        }
      } else if (sNode.name === 'VideoBadge') {
        nodesToPosition.push({
          uuid: sNode.uuid,
          properties: { position: { x: 0, y: 0, z: 0 } }
        });
        if (transformUuid) {
          compsToModify.push({
            uuid: transformUuid,
            properties: [
              { path: 'contentSize.width', type: 'Number', value: 40 },
              { path: 'contentSize.height', type: 'Number', value: 30 }
            ]
          });
        }
        if (spriteUuid) {
          compsToModify.push({
            uuid: spriteUuid,
            properties: [
              { path: 'spriteFrame', type: 'cc.SpriteFrame', value: { uuid: videoBadgeFrameUuid } },
              { path: 'color.r', type: 'Number', value: 255 },
              { path: 'color.g', type: 'Number', value: 255 },
              { path: 'color.b', type: 'Number', value: 255 }
            ]
          });
        }
      }
    }

    if (nodesToPosition.length > 0) {
      await client.callTool({
        name: 'modify_nodes',
        arguments: { nodes: nodesToPosition }
      });
    }

    if (compsToModify.length > 0) {
      await client.callTool({
        name: 'modify_components',
        arguments: { components: compsToModify }
      });
    }

    console.log(`Built tube ${tData.name} complete.`);
  }

  // Save the entire completed scene
  await client.callTool({
    name: 'operate_current_scene',
    arguments: { operation: 'save' }
  });
  console.log('✅ Entire Level 2 scene built and saved successfully!');

  await client.close();
}

main().catch(console.error);
