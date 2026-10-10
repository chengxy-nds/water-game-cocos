import { ImageGenerationConfig, ImageGenerationProvider, ImageGenerationModel } from '../config.js';

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  provider?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  negativePrompt?: string;
  initImageBuffer?: Buffer; // Pre-generated image buffer to use as init image
}

export interface ImageGenerationResponse {
  success: boolean;
  imageBuffer?: Buffer;
  error?: string;
  metadata?: {
    provider: string;
    model: string;
    prompt: string;
    width: number;
    height: number;
    seed?: number;
  };
}

export class ImageGenerationService {
  private config: ImageGenerationConfig;

  constructor(config: ImageGenerationConfig) {
    this.config = config;
  }

  updateConfig(config: ImageGenerationConfig): void {
    this.config = config;
  }

  getAvailableModels(): ImageGenerationModel[] {
    if (!this.config.enabled) {
      return [];
    }

    const models: ImageGenerationModel[] = [];
    for (const provider of this.config.providers) {
      if (provider.enabled) {
        models.push(...provider.models.filter(model => model.enabled));
      }
    }
    return models;
  }

  getAvailableProviders(): ImageGenerationProvider[] {
    return this.config.providers.filter(provider => provider.enabled);
  }

  async testProvider(providerId: string, testPrompt: string = 'A simple test image'): Promise<{ success: boolean; error?: string; message?: string; debug?: any }> {
    console.log(`[ImageGenerationService] Testing provider: ${providerId}`);
    
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) {
      console.error(`[ImageGenerationService] Provider '${providerId}' not found in config`);
      console.log(`[ImageGenerationService] Available providers:`, this.config.providers.map(p => p.id));
      return {
        success: false,
        error: `Provider '${providerId}' not found`
      };
    }

    console.log(`[ImageGenerationService] Found provider:`, {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      enabled: provider.enabled,
      baseUrl: provider.config?.baseUrl,
      hasApiKey: !!provider.config?.apiKey,
      timeout: provider.config?.timeout
    });

    if (!provider.enabled) {
      console.warn(`[ImageGenerationService] Provider '${providerId}' is disabled`);
      return {
        success: false,
        error: `Provider '${providerId}' is disabled`
      };
    }

    // Find the first available model for testing
    const availableModel = provider.models.find(m => m.enabled);
    if (!availableModel) {
      console.error(`[ImageGenerationService] No enabled models found for provider '${providerId}'`);
      console.log(`[ImageGenerationService] Available models:`, provider.models.map(m => ({ id: m.id, enabled: m.enabled })));
      return {
        success: false,
        error: `No enabled models found for provider '${providerId}'`
      };
    }

    console.log(`[ImageGenerationService] Using test model:`, {
      id: availableModel.id,
      name: availableModel.name,
      enabled: availableModel.enabled
    });

    try {
      // Perform a lightweight test (just check connectivity, don't generate full image)
      let testUrl: string;
      let testHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...provider.config.customHeaders
      };

      if (provider.config.apiKey) {
        testHeaders['Authorization'] = `Bearer ${provider.config.apiKey}`;
        console.log(`[ImageGenerationService] Using API key (length: ${provider.config.apiKey.length})`);
      } else {
        console.log(`[ImageGenerationService] No API key provided`);
      }

      switch (provider.type) {
        case 'stable-diffusion':
          testUrl = `${provider.config.baseUrl}/health`;
          break;
        case 'automatic1111':
          testUrl = `${provider.config.baseUrl}/sdapi/v1/options`;
          break;
        case 'dall-e':
          testUrl = `${provider.config.baseUrl}/v1/models`;
          break;
        case 'custom':
          testUrl = `${provider.config.baseUrl}/health`;
          break;
        default:
          console.error(`[ImageGenerationService] Unsupported provider type: ${provider.type}`);
          return {
            success: false,
            error: `Unsupported provider type: ${provider.type}`
          };
      }

      console.log(`[ImageGenerationService] Testing URL: ${testUrl}`);
      console.log(`[ImageGenerationService] Request headers:`, Object.keys(testHeaders));
      
      const timeoutMs = provider.config.timeout || 10000;
      console.log(`[ImageGenerationService] Request timeout: ${timeoutMs}ms`);

      const startTime = Date.now();
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: testHeaders,
        signal: AbortSignal.timeout(timeoutMs)
      });
      const responseTime = Date.now() - startTime;

      console.log(`[ImageGenerationService] Response received in ${responseTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });

      if (response.ok) {
        let responseText = '';
        try {
          responseText = await response.text();
          console.log(`[ImageGenerationService] Response body (first 200 chars):`, responseText.substring(0, 200));
        } catch (textError) {
          console.warn(`[ImageGenerationService] Could not read response text:`, textError);
        }

        return {
          success: true,
          message: `Provider '${provider.name}' is reachable and responding (${responseTime}ms)`,
          debug: {
            responseTime,
            status: response.status,
            url: testUrl,
            responseBodyLength: responseText.length
          }
        };
      } else {
        let errorBody = '';
        try {
          errorBody = await response.text();
          console.error(`[ImageGenerationService] Error response body:`, errorBody);
        } catch (textError) {
          console.warn(`[ImageGenerationService] Could not read error response:`, textError);
        }

        return {
          success: false,
          error: `Provider returned HTTP ${response.status}: ${response.statusText}`,
          debug: {
            responseTime,
            status: response.status,
            statusText: response.statusText,
            url: testUrl,
            errorBody: errorBody.substring(0, 500)
          }
        };
      }
    } catch (error) {
      console.error(`[ImageGenerationService] Connection failed:`, error);
      
      let errorDetails: any = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
      };

      if (error instanceof Error) {
        errorDetails.stack = error.stack;
      }

      // Additional debugging for common error types
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorDetails.possibleCause = 'Network connectivity issue or invalid URL';
      } else if (error instanceof Error && error.name === 'AbortError') {
        errorDetails.possibleCause = `Request timeout (${provider.config.timeout || 10000}ms exceeded)`;
      } else if (error instanceof Error && error.message.includes('ENOTFOUND')) {
        errorDetails.possibleCause = 'DNS resolution failed - check the base URL';
      } else if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        errorDetails.possibleCause = 'Connection refused - service may be down or incorrect port';
      }

      return {
        success: false,
        error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        debug: errorDetails
      };
    }
  }

  async fetchAvailableModels(providerId: string): Promise<{ success: boolean; models?: any[]; error?: string; debug?: any }> {
    console.log(`[ImageGenerationService] Fetching models for provider: ${providerId}`);
    
    const provider = this.config.providers.find(p => p.id === providerId);
    if (!provider) {
      console.error(`[ImageGenerationService] Provider '${providerId}' not found`);
      console.log(`[ImageGenerationService] Available providers:`, this.config.providers.map(p => p.id));
      return {
        success: false,
        error: `Provider '${providerId}' not found`
      };
    }

    console.log(`[ImageGenerationService] Found provider for model fetch:`, {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.config?.baseUrl,
      hasApiKey: !!provider.config?.apiKey
    });

    try {
      let modelsUrl: string;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...provider.config.customHeaders
      };

      if (provider.config.apiKey) {
        headers['Authorization'] = `Bearer ${provider.config.apiKey}`;
        console.log(`[ImageGenerationService] Using API key for model fetch (length: ${provider.config.apiKey.length})`);
      } else {
        console.log(`[ImageGenerationService] No API key provided for model fetch`);
      }

      switch (provider.type) {
        case 'stable-diffusion':
          modelsUrl = `${provider.config.baseUrl}/api/v1/engines`;
          break;
        case 'automatic1111':
          modelsUrl = `${provider.config.baseUrl}/sdapi/v1/sd-models`;
          break;
        case 'dall-e':
          modelsUrl = `${provider.config.baseUrl}/v1/models`;
          break;
        case 'custom':
          modelsUrl = `${provider.config.baseUrl}/models`;
          break;
        default:
          console.error(`[ImageGenerationService] Model discovery not supported for provider type: ${provider.type}`);
          return {
            success: false,
            error: `Model discovery not supported for provider type: ${provider.type}`
          };
      }

      console.log(`[ImageGenerationService] Fetching models from URL: ${modelsUrl}`);
      console.log(`[ImageGenerationService] Request headers:`, Object.keys(headers));

      const timeoutMs = provider.config.timeout || 30000;
      console.log(`[ImageGenerationService] Request timeout: ${timeoutMs}ms`);

      const startTime = Date.now();
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs)
      });
      const responseTime = Date.now() - startTime;

      console.log(`[ImageGenerationService] Models response received in ${responseTime}ms:`, {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          errorBody = await response.text();
          console.error(`[ImageGenerationService] Models fetch error response:`, errorBody);
        } catch (textError) {
          console.warn(`[ImageGenerationService] Could not read error response:`, textError);
        }

        return {
          success: false,
          error: `Failed to fetch models: HTTP ${response.status}: ${response.statusText}`,
          debug: {
            responseTime,
            status: response.status,
            statusText: response.statusText,
            url: modelsUrl,
            errorBody: errorBody.substring(0, 500)
          }
        };
      }

      const data = await response.json();
      console.log(`[ImageGenerationService] Models data received:`, {
        type: typeof data,
        isArray: Array.isArray(data),
        dataKeys: typeof data === 'object' ? Object.keys(data) : 'N/A',
        arrayLength: Array.isArray(data) ? data.length : 'N/A',
        firstItem: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : 'N/A'
      });

      let models: any[] = [];

      // Parse response based on provider type
      switch (provider.type) {
        case 'stable-diffusion':
          const engines = data.engines || data || [];
          console.log(`[ImageGenerationService] Processing ${engines.length} Stable Diffusion engines`);
          models = engines.map((engine: any) => {
            console.log(`[ImageGenerationService] Processing engine:`, Object.keys(engine));
            return {
              id: engine.id || engine.name,
              name: engine.name || engine.id,
              description: engine.description || `Stable Diffusion model: ${engine.name || engine.id}`,
              provider: 'stable-diffusion',
              enabled: true
            };
          });
          break;
        case 'automatic1111':
          const a1111Models = data || [];
          console.log(`[ImageGenerationService] Processing ${a1111Models.length} AUTOMATIC1111 models`);
          models = a1111Models.map((model: any) => {
            console.log(`[ImageGenerationService] Processing A1111 model:`, Object.keys(model));
            return {
              id: model.title || model.model_name || model.filename,
              name: model.model_name || model.title || model.filename,
              description: `AUTOMATIC1111 model: ${model.model_name || model.title}`,
              provider: 'automatic1111',
              enabled: true
            };
          });
          break;
        case 'dall-e':
          const dalleModels = (data.data || data || [])
            .filter((model: any) => model.id.includes('dall-e'));
          console.log(`[ImageGenerationService] Processing ${dalleModels.length} DALL-E models (filtered from ${(data.data || data || []).length} total)`);
          models = dalleModels.map((model: any) => {
            console.log(`[ImageGenerationService] Processing DALL-E model:`, Object.keys(model));
            return {
              id: model.id,
              name: model.id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              description: `OpenAI model: ${model.id}`,
              provider: 'dall-e',
              enabled: true
            };
          });
          break;
        case 'custom':
          const customModels = data.models || data || [];
          console.log(`[ImageGenerationService] Processing ${customModels.length} custom models`);
          models = customModels.map((model: any) => {
            console.log(`[ImageGenerationService] Processing custom model:`, Object.keys(model));
            return {
              id: model.id || model.name,
              name: model.name || model.id,
              description: model.description || `Custom model: ${model.name || model.id}`,
              provider: 'custom',
              enabled: true
            };
          });
          break;
      }

      console.log(`[ImageGenerationService] Successfully processed ${models.length} models for provider ${providerId}`);
      console.log(`[ImageGenerationService] Models summary:`, models.map(m => ({ id: m.id, name: m.name })));

      return {
        success: true,
        models,
        debug: {
          responseTime,
          rawDataType: typeof data,
          rawDataKeys: typeof data === 'object' ? Object.keys(data) : null,
          processedModelsCount: models.length,
          url: modelsUrl
        }
      };
    } catch (error) {
      console.error(`[ImageGenerationService] Failed to fetch models:`, error);
      
      let errorDetails: any = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
      };

      if (error instanceof Error) {
        errorDetails.stack = error.stack;
      }

      // Additional debugging for common error types
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        errorDetails.possibleCause = 'Invalid JSON response from server';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorDetails.possibleCause = 'Network connectivity issue or invalid URL';
      } else if (error instanceof Error && error.name === 'AbortError') {
        errorDetails.possibleCause = `Request timeout (${provider.config.timeout || 30000}ms exceeded)`;
      }

      return {
        success: false,
        error: `Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`,
        debug: errorDetails
      };
    }
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Image generation is disabled'
      };
    }

    // Determine provider and model
    const providerName = request.provider || this.config.defaultProvider;
    const modelName = request.model || this.config.defaultModel;

    const provider = this.config.providers.find(p => p.id === providerName);
    if (!provider || !provider.enabled) {
      return {
        success: false,
        error: `Provider '${providerName}' not found or disabled`
      };
    }

    const model = provider.models.find(m => m.id === modelName);
    if (!model || !model.enabled) {
      return {
        success: false,
        error: `Model '${modelName}' not found or disabled for provider '${providerName}'`
      };
    }

    try {
      switch (provider.type) {
        case 'stable-diffusion':
          return await this.generateWithStableDiffusion(provider, model, request);
        case 'automatic1111':
          return await this.generateWithAutomatic1111(provider, model, request);
        case 'dall-e':
          return await this.generateWithDallE(provider, model, request);
        case 'custom':
          return await this.generateWithCustomProvider(provider, model, request);
        default:
          return {
            success: false,
            error: `Unsupported provider type: ${provider.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Generation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async generateWithStableDiffusion(
    provider: ImageGenerationProvider,
    model: ImageGenerationModel,
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    const response = await fetch(`${provider.config.baseUrl}/api/v1/generation/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...provider.config.customHeaders,
        ...(provider.config.apiKey ? { 'Authorization': `Bearer ${provider.config.apiKey}` } : {})
      },
      body: JSON.stringify({
        text_prompts: [{ text: request.prompt }],
        ...(request.negativePrompt ? { text_prompts: [{ text: request.prompt }, { text: request.negativePrompt, weight: -1 }] } : {}),
        cfg_scale: request.guidanceScale || 7.5,
        height: request.height || 512,
        width: request.width || 512,
        steps: request.steps || 30,
        samples: 1,
        seed: request.seed,
        ...(request.initImageBuffer ? { init_image: request.initImageBuffer.toString('base64') } : {})
      }),
      signal: AbortSignal.timeout(provider.config.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const imageData = data.artifacts[0].base64;
    const imageBuffer = Buffer.from(imageData, 'base64');

    return {
      success: true,
      imageBuffer,
      metadata: {
        provider: provider.id,
        model: model.id,
        prompt: request.prompt,
        width: request.width || 512,
        height: request.height || 512,
        seed: data.artifacts[0].seed
      }
    };
  }

  private async generateWithAutomatic1111(
    provider: ImageGenerationProvider,
    model: ImageGenerationModel,
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    // Use img2img endpoint if we have an init image (SVG template), otherwise use txt2img
    const endpoint = request.initImageBuffer ? '/sdapi/v1/img2img' : '/sdapi/v1/txt2img';
    
    const requestBody: any = {
      prompt: request.prompt,
      negative_prompt: request.negativePrompt || '',
      width: request.width || 512,
      height: request.height || 512,
      steps: request.steps || 30,
      cfg_scale: request.guidanceScale || 7.5,
      seed: request.seed || -1,
      batch_size: 1
    };

    // Add init image parameters for img2img endpoint
    if (request.initImageBuffer) {
      requestBody.init_images = [request.initImageBuffer.toString('base64')];
      requestBody.denoising_strength = 0.7; // Control how much the AI modifies the init image
    }

    const response = await fetch(`${provider.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...provider.config.customHeaders
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(provider.config.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const imageData = data.images[0];
    const imageBuffer = Buffer.from(imageData, 'base64');

    return {
      success: true,
      imageBuffer,
      metadata: {
        provider: provider.id,
        model: model.id,
        prompt: request.prompt,
        width: request.width || 512,
        height: request.height || 512,
        seed: data.parameters?.seed
      }
    };
  }

  private async generateWithDallE(
    provider: ImageGenerationProvider,
    model: ImageGenerationModel,
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    const modelName = model.id === 'dall-e-3' ? 'dall-e-3' : 'dall-e-2';
    const size = `${request.width || 1024}x${request.height || 1024}`;

    const response = await fetch(`${provider.config.baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.config.apiKey}`,
        ...provider.config.customHeaders
      },
      body: JSON.stringify({
        model: modelName,
        prompt: request.prompt,
        size: size,
        quality: model.id === 'dall-e-3' ? 'standard' : undefined,
        response_format: 'b64_json',
        n: 1
      }),
      signal: AbortSignal.timeout(provider.config.timeout || 60000)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const imageData = data.data[0].b64_json;
    const imageBuffer = Buffer.from(imageData, 'base64');

    return {
      success: true,
      imageBuffer,
      metadata: {
        provider: provider.id,
        model: model.id,
        prompt: request.prompt,
        width: request.width || 1024,
        height: request.height || 1024
      }
    };
  }

  private async generateWithCustomProvider(
    provider: ImageGenerationProvider,
    model: ImageGenerationModel,
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    // Custom provider implementation - can be extended based on specific needs
    const response = await fetch(`${provider.config.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...provider.config.customHeaders,
        ...(provider.config.apiKey ? { 'Authorization': `Bearer ${provider.config.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: model.id,
        prompt: request.prompt,
        width: request.width || 512,
        height: request.height || 512,
        steps: request.steps,
        guidance_scale: request.guidanceScale,
        seed: request.seed,
        negative_prompt: request.negativePrompt,
        init_image_buffer: request.initImageBuffer?.toString('base64')
      }),
      signal: AbortSignal.timeout(provider.config.timeout || 30000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const imageBuffer = Buffer.from(data.image, 'base64');

    return {
      success: true,
      imageBuffer,
      metadata: {
        provider: provider.id,
        model: model.id,
        prompt: request.prompt,
        width: request.width || 512,
        height: request.height || 512
      }
    };
  }
}
