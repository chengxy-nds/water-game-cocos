import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import packageJSON from '../../../package.json';
import { AssetInfo } from "@cocos/creator-types/editor/packages/asset-db/@types/public";
import { McpServerManager } from "../server-manager";
import { ImageGenerationRequest } from "../services/image-generation-service.js";
import { Color } from "sharp";

export function registerGenerateImageAssetTool(server: McpServer, serverManagerInstance?: McpServerManager): void {
  
  // Get the image generation service from the server manager
  const serverManager = serverManagerInstance || McpServerManager.getInstance();
  if (!serverManager) {
    console.warn('Server manager not available, image generation features will be limited');
    console.log('Will register with SVG-only functionality');
  }
  
  const imageService = serverManager?.getImageGenerationService();
  const availableModels = imageService?.getAvailableModels() || [];
  const hasAIGeneration = imageService && availableModels.length > 0;
  
  // Create dynamic model enum from available models
  const modelEnum = availableModels.length > 0 
    ? availableModels.map(model => model.id)
    : ['default'];

  // Build input schema based on AI generation availability
  let toolRegistration: any;
  
  if (hasAIGeneration) {
    // Full functionality: SVG-only, AI-only, and AI with SVG template
    const description = "Generates image assets using three distinct modes: 1) SVG/emoji as standalone image (provide only 'svgContent'), 2) AI generation from text prompt (provide only 'prompt'), 3) AI generation using SVG as template (provide both 'svgContent' and 'prompt'). Supports optional background removal for creating transparent icons (works best with light backgrounds).";
    toolRegistration = {
      title: "Generate Image Asset",
      description: description,
      inputSchema: {
        // Content generation - mutually exclusive modes
        svgContent: z.string().describe("SVG markup content or single emoji symbol. Used for: 1) Standalone SVG image (when no prompt provided), 2) Template for AI generation (when prompt is also provided).").optional(),
        prompt: z.string().describe("Text prompt for AI image generation. When provided with svgContent, uses SVG as template/init image. When provided alone, generates from text only.").optional(),
        destination: z.string().describe("Path where to create the new asset (e.g., db://assets/icon.png)"),
        assetType: z.enum(["raw", "texture", "normal-map", "sprite-frame", "texture-cube"]).describe("Type of asset to create (e.g., 'texture' for materials, 'sprite-frame' for sprites)").default("sprite-frame"),
        overwrite: z.boolean().describe("Whether to overwrite if target exists").optional().default(false),
        rename: z.boolean().describe("Whether to auto-rename if conflict occurs").optional().default(false),
        
        // AI Image Generation parameters (only used when prompt is provided)
        model: z.enum(modelEnum as [string, ...string[]]).describe("AI model to use for generation (required if prompt is provided)").optional().default(modelEnum[0]),
        steps: z.number().describe("Number of diffusion steps").optional().default(40),
        guidanceScale: z.number().describe("Guidance scale for generation").optional().default(7.5),
        seed: z.number().describe("Random seed for reproducible results").optional(),
        negativePrompt: z.string().describe("Negative prompt to avoid certain features").optional(),
        tryToRemoveBackground: z.boolean().describe("Whether to attempt background removal (useful for sprites/icons)").optional().default(false)
      }
    };
  } else {
    // SVG-only functionality
    const description = "Generates image assets from SVG markup content or emoji symbols.";
    toolRegistration = {
      title: "Generate Image Asset",
      description: description,
      inputSchema: {
        // SVG generation only - svgContent is required
        svgContent: z.string().describe("SVG markup content or single emoji symbol to convert to image asset."),
        destination: z.string().describe("Path where to create the new asset (e.g., db://assets/icon.png)"),
        assetType: z.enum(["raw", "texture", "normal-map", "sprite-frame", "texture-cube"]).describe("Type of asset to create (e.g., 'texture' for materials, 'sprite-frame' for sprites)").default("sprite-frame"),
        overwrite: z.boolean().describe("Whether to overwrite if target exists").optional().default(false),
        rename: z.boolean().describe("Whether to auto-rename if conflict occurs").optional().default(false),
      }
    };
  }

  // Register the tool with dynamic schema based on AI capabilities
  server.registerTool(
    "generate_image_asset",
    toolRegistration,
    async (args: any) => {
      const { svgContent, destination, assetType = "sprite-frame", overwrite = false, rename = false, tryToRemoveBackground = false, prompt, model, steps = 40, guidanceScale = 7.5, seed, negativePrompt } = args;
        
        // Validate input parameters and determine generation mode
        if (hasAIGeneration) {
          // Full functionality validation
          if (!svgContent && !prompt) {
            throw new Error('Must provide either svgContent (for SVG image), prompt (for AI generation), or both (for AI generation with SVG template)');
          }
        } else {
          // SVG-only validation
          if (!svgContent) {
            throw new Error('svgContent is required when AI image generation is not available. Please provide SVG markup content or emoji symbol.');
          }
          if (prompt) {
            throw new Error('AI image generation is not available. Please configure an AI image generation provider to use prompt-based generation.');
          }
        }

        // Determine generation mode
        let generationMode: 'svg-only' | 'ai-only' | 'ai-with-svg-template';
        if (svgContent && prompt) {
          generationMode = 'ai-with-svg-template';
        } else if (prompt) {
          generationMode = 'ai-only';
        } else if (svgContent) {
          generationMode = 'svg-only';
        } else {
          throw new Error('Invalid parameter combination');
        }

        // Validate AI generation requirements
        if ((generationMode === 'ai-only' || generationMode === 'ai-with-svg-template') && (!imageService || imageService.getAvailableModels().length === 0)) {
          throw new Error('AI image generation requested but no AI models are available. Please configure image generation service.');
        }
        await Editor.Message.request('scene', 'execute-scene-script', { name: packageJSON.name, method: 'startCaptureSceneLogs', args: [] });
        try {
          const errors: string[] = [];
          let assetCreationResult: AssetInfo | null = null;

          try {
            let imageBuffer: Buffer | null = null;

            // Generate SVG image first if SVG content is provided (needed for both SVG-only and AI template modes)
            let svgImageBuffer: Buffer | null = null;
            if (svgContent) {
              try {
                await Editor.Message.request(packageJSON.name, 'open-image-generator');
                const generatedBuffer = await Editor.Message.request(packageJSON.name, 'generate-image-from-svg', svgContent);
                if (generatedBuffer) {
                  svgImageBuffer = Buffer.from(generatedBuffer);
                }
              } catch (svgError) {
                if (generationMode === 'svg-only') {
                  throw new Error('Failed to generate image from SVG content');
                } else {
                  errors.push('Warning: Could not generate SVG template, proceeding with AI generation only');
                }
              }
            }
            
            if (generationMode === 'svg-only') {
              // Use SVG as standalone image
              if (!svgImageBuffer) {
                throw new Error('Failed to generate SVG image');
              }
              imageBuffer = svgImageBuffer;
              
            } else if (generationMode === 'ai-only' || generationMode === 'ai-with-svg-template') {
              // AI Image Generation
              if (!imageService) {
                throw new Error('Image generation service not available');
              }

              let negativePromptAdapted = negativePrompt || '';
              if (tryToRemoveBackground) {
                negativePromptAdapted += ' vignette, border, frame';
              }
              let promptAdapted = prompt || '';
              if (assetType === 'texture' && !promptAdapted.includes('seamless')) {
                promptAdapted += ' seamless';
              }

              const generationRequest: ImageGenerationRequest = {
                prompt: promptAdapted,
                model,
                width: 512,
                height: 512,
                steps,
                guidanceScale,
                seed,
                negativePrompt: negativePromptAdapted,
                initImageBuffer: generationMode === 'ai-with-svg-template' ? svgImageBuffer || undefined : undefined
              };

              const response = await imageService.generateImage(generationRequest);
              if (response.success && response.imageBuffer) {
                imageBuffer = response.imageBuffer;
              } else {
                throw new Error(response.error || 'AI image generation failed');
              }
            }

            if (!imageBuffer) {
              throw new Error('Failed to generate image');
            }

            // Apply background removal if requested
            if (tryToRemoveBackground) {
              try {
                // Use sharp for basic background removal (removes white/light backgrounds)
                const sharp = await import('sharp');
                
                // Create a sharp instance from the buffer
                const image = sharp.default(imageBuffer);
                
                // Apply background removal by making white/light pixels transparent
                // This is a simple approach that works well for icons with light backgrounds
                const processedImage = await image
                  .ensureAlpha() // Ensure the image has an alpha channel
                  .raw() // Get raw pixel data
                  .toBuffer({ resolveWithObject: true });
                
                // Process pixels to make light backgrounds transparent
                const { data, info } = processedImage;
                // Getting the target color from the first pixel (assumes uniform background)
                const targetColor = { r: data[0], g: data[1], b: data[2] };

                // Thresholds for background removal
                const innerThreshold = 10;  // fully transparent
                const outerThreshold = 40;  // fully opaque

                function colorDistance(c1 : { r: number, g: number, b: number }, 
                                       c2 : { r: number, g: number, b: number }): number {
                  // Euclidean distance in RGB
                  return Math.sqrt(
                    Math.pow(c1.r - c2.r, 2) +
                    Math.pow(c1.g - c2.g, 2) +
                    Math.pow(c1.b - c2.b, 2)
                  );
                }

                function getAlphaFromDistance(distance: number): number {
                  if (distance <= innerThreshold) return 0;
                  if (distance >= outerThreshold) return 255;
                  const ratio = (distance - innerThreshold) / (outerThreshold - innerThreshold);
                  return Math.round(ratio * 255);
                }
                
                for (let i = 0; i < data.length; i += 4) {
                  const r = data[i];
                  const g = data[i + 1];
                  const b = data[i + 2];
                  
                  // Calculate brightness
                  const dist = colorDistance({ r, g, b }, targetColor);
                  data[i + 3] = getAlphaFromDistance(dist);
                }
                
                // Convert back to PNG
                imageBuffer = await sharp.default(data, {
                  raw: {
                    width: info.width,
                    height: info.height,
                    channels: info.channels
                  }
                }).png().toBuffer();
                
              } catch (bgRemovalError) {
                const errorMsg = bgRemovalError instanceof Error ? bgRemovalError.message : String(bgRemovalError);
              }
            }

            // Import modules
            const fs = await import('fs');
            const path_module = await import('path');
            const os = await import('os');
            
            // Ensure the path ends with .png
            let pngPath = destination;
            if (!pngPath.endsWith('.png')) {
              pngPath = pngPath.replace(/\.[^.]*$/, '.png');
            }
            
            // Create temporary file path
            const tempDir = os.tmpdir();
            const tempFileName = `temp_image_${Date.now()}.png`;
            const tempFilePath = path_module.join(tempDir, tempFileName);
            
            // Write buffer to temporary file
            await fs.promises.writeFile(tempFilePath, imageBuffer);
            
            // Import the temporary file as asset
            let importResult = await Editor.Message.request('asset-db', 'import-asset', tempFilePath, pngPath, {
              overwrite: overwrite,
              rename: rename
            });
            
            // Clean up temporary file
            try {
              await fs.promises.unlink(tempFilePath);
            } catch (cleanupError) {
              console.warn('Failed to cleanup temporary file:', cleanupError);
            }
            
            if (!importResult) {
              throw new Error('Failed to import generated image as asset');
            }

            // Apply the specified asset type to meta
            try {
              const modifiedResult = await modifyAssetMeta(importResult.url, assetType);
              if (modifiedResult) {
                assetCreationResult = modifiedResult;
              } else {
                assetCreationResult = importResult;
                errors.push(`Asset created but failed to apply type '${assetType}' to meta`);
              }
            } catch (metaError) {
              assetCreationResult = importResult;
              errors.push(`Asset created but failed to modify meta: ${metaError instanceof Error ? metaError.message : String(metaError)}`);
            }

          } catch (generationError) {
            // Close image generator panel if SVG was processed (any mode that used SVG content)
            if (svgContent) {
              try {
                await Editor.Message.request('panels', 'close', `${packageJSON.name}.image-generator`);
              } catch (closeError) {
                console.warn('Failed to close image generator panel:', closeError);
              }
            }
            errors.push(`Error generating image asset: ${generationError instanceof Error ? generationError.message : String(generationError)}`);
          }

          // Build response message
          let message = '';
          
          if (assetCreationResult) {
            const modeDescription = generationMode === 'svg-only' ? 'SVG image' : 
                                  generationMode === 'ai-only' ? 'AI-generated image' : 
                                  'AI-generated image with SVG template';
            const backgroundInfo = tryToRemoveBackground ? ' with background removal' : '';
            message = `Successfully generated ${modeDescription}${backgroundInfo} asset with UUID ${assetCreationResult.uuid}\n`;

            // Add sub-assets info if available
            if (assetCreationResult.subAssets && Object.keys(assetCreationResult.subAssets).length > 0) {
              message += `\nSub-Assets:\n`;
              Object.keys(assetCreationResult.subAssets).forEach(key => {
                const subAsset = assetCreationResult!.subAssets[key];
                message += `- ${subAsset.type} (UUID: ${McpServerManager.encodeUuid(subAsset.uuid)})\n`;
              });
            }
          } else {
            message = `Failed to generate image asset at '${destination}'`;
          }

          if (errors.length > 0) {
            message += `\n\nWarnings/Errors:\n${errors.join('\n')}`;
          }

          const capturedLogs: Array<string> = 
            await Editor.Message.request('scene', 'execute-scene-script', { name: packageJSON.name, method: 'getCapturedSceneLogs', args: [] });
          capturedLogs.forEach(log => message += ("\n" + log));

          return {
            content: [{
              type: "text" as const,
              text: message
            }]
          };

        } catch (error) {
          const capturedLogs: Array<string> = 
            await Editor.Message.request('scene', 'execute-scene-script', { name: packageJSON.name, method: 'getCapturedSceneLogs', args: [] });
          
          let errorMessage = `Error generating image asset: ${error instanceof Error ? error.message : String(error)}`;
          capturedLogs.forEach(log => errorMessage += ("\n" + log));

          return {
            content: [{
              type: "text" as const,
              text: errorMessage
            }]
          };
        }
      }
    );
}

/**
 * Modify asset meta file to set the specified type
 */
async function modifyAssetMeta(assetUrl: string, assetType: string): Promise<AssetInfo | null> {
  try {
    // Get the meta file info
    const metaInfo = await Editor.Message.request('asset-db', 'query-asset-meta', assetUrl);
    
    if (!metaInfo) {
      throw new Error('Could not find meta file for asset');
    }

    // Apply the asset type to meta
    switch (assetType) {
      case "raw":
        metaInfo.userData.type = "raw";
        break;
      case "texture":
        metaInfo.userData.type = "texture";
        break;
      case "normal-map":
        metaInfo.userData.type = "normal map";
        break;
      case "sprite-frame":
        metaInfo.userData.type = "sprite-frame";
        break;
      case "texture-cube":
        metaInfo.userData.type = "texture cube";
        break;
      default:
        throw new Error(`Unsupported asset type: ${assetType}`);
    }

    // Save the modified meta content
    await Editor.Message.request('asset-db', 'save-asset-meta', assetUrl, JSON.stringify(metaInfo));

    // Refresh the asset to apply changes
    await Editor.Message.request('asset-db', 'refresh-asset', assetUrl);
    
    // Return updated asset info
    return await Editor.Message.request('asset-db', 'query-asset-info', assetUrl);
  } catch (error) {
    console.warn(`Failed to modify meta file for ${assetType}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}