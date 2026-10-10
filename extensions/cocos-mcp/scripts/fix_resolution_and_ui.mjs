import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'));
  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  // 1. Set Project Design Resolution to Portrait (750 x 1334, Fit Width)
  const resProject = await client.callTool({
    name: 'operate_project_settings',
    arguments: {
      designResolution: {
        width: 750,
        height: 1334,
        fitWidth: true,
        fitHeight: false
      }
    }
  });
  console.log('Project resolution updated:', resProject.content[0].text);

  // 2. Update Canvas component & UITransform
  // Canvas UUID: a0XRZA4aBBg5xRBsl3lum4, Canvas Component: a6dJ0ItkJMyqJEYTdurvoF
  await client.callTool({
    name: 'modify_components',
    arguments: {
      components: [
        {
          uuid: 'a6dJ0ItkJMyqJEYTdurvoF', // Canvas Component
          properties: [
            { path: 'designResolution.width', type: 'Number', value: 750 },
            { path: 'designResolution.height', type: 'Number', value: 1334 },
            { path: 'fitWidth', type: 'Boolean', value: true },
            { path: 'fitHeight', type: 'Boolean', value: false }
          ]
        },
        {
          uuid: '23zwTld8FC6LTLDRgCgnlz', // Canvas UITransform
          properties: [
            { path: 'contentSize.width', type: 'Number', value: 750 },
            { path: 'contentSize.height', type: 'Number', value: 1334 }
          ]
        },
        // Fix Level Label to clear English LEVEL 2
        {
          uuid: '07IR8Ir9FDLppbNldrKUdW',
          properties: [
            { path: 'string', type: 'String', value: 'LEVEL 2' },
            { path: 'fontSize', type: 'Number', value: 36 }
          ]
        }
      ]
    }
  });

  // Save Scene
  await client.callTool({
    name: 'operate_current_scene',
    arguments: { operation: 'save' }
  });
  console.log('Scene updated to Portrait 750x1334 and saved!');

  await client.close();
}

main().catch(console.error);
