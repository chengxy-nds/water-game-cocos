import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent } from 'vue';

const panelDataMap = new WeakMap<any, App>();

/**
 * AI Image Generation Configuration Panel
 */
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('AI Config panel showed'); },
        hide() { console.log('AI Config panel hided'); },
    },
    template: readFileSync(join(__dirname, '../../../static/template/ai-config/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/ai-config/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    methods: {
    },
    ready() {
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
           
            app.component('AiConfigPanel', defineComponent({
                data() {
                    return {
                        config: {
                            imageGeneration: {
                                providers: [] as any[],
                                defaultProvider: '',
                                globalSettings: {
                                    timeout: 30000,
                                    retries: 3,
                                    quality: 'high'
                                }
                            }
                        },
                        isLoading: false,
                        notification: {
                            show: false,
                            type: 'info',
                            message: ''
                        },
                        testResults: new Map(),
                        newProvider: {
                            id: '',
                            name: '',
                            type: 'stable-diffusion',
                            baseUrl: '',
                            apiKey: '',
                            models: [] as any[]
                        },
                        newModel: {
                            id: '',
                            name: '',
                            type: 'text2img',
                            providerId: ''
                        },
                        editingProvider: null as any,
                        editingModel: null as any,
                        showProviderDialog: false,
                        showModelDialog: false,
                        showImportDialog: false
                    };
                }, 
                async mounted() {
                    await this.loadConfig();
                },
                methods: {
                    async loadConfig() {
                        this.isLoading = true;
                        try {
                            const config = await Editor.Message.request('cocos-mcp', 'get-image-config');
                            console.log('Loaded config:', config);
                            
                            // The server returns ImageGenerationConfig directly, so we need to wrap it
                            if (config) {
                                this.config.imageGeneration = {
                                    providers: config.providers || [],
                                    defaultProvider: config.defaultProvider || '',
                                    globalSettings: {
                                        timeout: config.timeout || 30000,
                                        retries: config.retries || 3,
                                        quality: config.quality || 'high'
                                    }
                                };
                            } else {
                                console.warn('No config returned, using defaults');
                                this.config.imageGeneration = {
                                    providers: [],
                                    defaultProvider: '',
                                    globalSettings: {
                                        timeout: 30000,
                                        retries: 3,
                                        quality: 'high'
                                    }
                                };
                            }
                        } catch (error) {
                            console.error('Failed to load config:', error);
                            this.showNotification('error', 'Failed to load configuration');
                            // Ensure we have a valid structure even on error
                            this.config.imageGeneration = {
                                providers: [],
                                defaultProvider: '',
                                globalSettings: {
                                    timeout: 30000,
                                    retries: 3,
                                    quality: 'high'
                                }
                            };
                        } finally {
                            this.isLoading = false;
                        }
                    },

                    async saveConfig() {
                        this.isLoading = true;
                        try {
                            // Convert our Vue config structure back to the server's expected format
                            // Ensure we only send serializable data (no Maps, functions, etc.)
                            const configToSave = {
                                enabled: true,
                                providers: JSON.parse(JSON.stringify(this.config.imageGeneration.providers)), // Deep clone to remove Vue reactivity
                                defaultProvider: this.config.imageGeneration.defaultProvider,
                                timeout: this.config.imageGeneration.globalSettings.timeout,
                                retries: this.config.imageGeneration.globalSettings.retries,
                                quality: this.config.imageGeneration.globalSettings.quality
                            };
                            
                            console.log('Saving config:', configToSave);
                            await Editor.Message.request('cocos-mcp', 'save-image-config', configToSave);
                            this.showNotification('success', 'Configuration saved successfully');
                        } catch (error) {
                            console.error('Failed to save config:', error);
                            this.showNotification('error', 'Failed to save configuration');
                        } finally {
                            this.isLoading = false;
                        }
                    },

                    // Provider Management
                    openProviderDialog(provider: any = null) {
                        if (provider) {
                            this.editingProvider = provider;
                            this.newProvider = {
                                id: provider.id,
                                name: provider.name,
                                type: provider.type,
                                baseUrl: provider.config?.baseUrl || '',
                                apiKey: provider.config?.apiKey || '',
                                models: provider.models || []
                            };
                        } else {
                            this.editingProvider = null;
                            this.newProvider = {
                                id: '',
                                name: '',
                                type: 'stable-diffusion',
                                baseUrl: '',
                                apiKey: '',
                                models: []
                            };
                        }
                        this.showProviderDialog = true;
                    },

                    async saveProvider() {
                        try {
                            // Convert our form data to the proper provider structure
                            const providerData = {
                                id: this.newProvider.id || `provider_${Date.now()}`,
                                name: this.newProvider.name,
                                type: this.newProvider.type,
                                enabled: true,
                                config: {
                                    baseUrl: this.newProvider.baseUrl,
                                    apiKey: this.newProvider.apiKey,
                                    timeout: 30000
                                },
                                models: JSON.parse(JSON.stringify(this.newProvider.models || []))
                            };

                            if (this.editingProvider) {
                                // Update existing provider
                                const index = this.config.imageGeneration.providers.findIndex((p: any) => p.id === this.editingProvider.id);
                                if (index !== -1) {
                                    this.config.imageGeneration.providers[index] = providerData;
                                }
                            } else {
                                // Add new provider
                                this.config.imageGeneration.providers.push(providerData);
                            }
                            await this.saveConfig();
                            this.showProviderDialog = false;
                            this.showNotification('success', `Provider ${this.editingProvider ? 'updated' : 'added'} successfully`);
                        } catch (error) {
                            console.error('Failed to save provider:', error);
                            this.showNotification('error', 'Failed to save provider');
                        }
                    },

                    async deleteProvider(providerId: string) {
                        try {
                            this.config.imageGeneration.providers = this.config.imageGeneration.providers.filter((p: any) => p.id !== providerId);
                            // Remove models associated with this provider
                            this.config.imageGeneration.providers.forEach((p: any) => {
                                p.models = p.models.filter((m: any) => m.providerId !== providerId);
                            });
                            await this.saveConfig();
                            this.showNotification('success', 'Provider deleted successfully');
                        } catch (error) {
                            console.error('Failed to delete provider:', error);
                            this.showNotification('error', 'Failed to delete provider');
                        }
                    },

                    async testProvider(providerId: string) {
                        this.isLoading = true;
                        try {
                            console.log('Testing provider:', providerId);
                            const result = await Editor.Message.request('cocos-mcp', 'test-provider', {
                                providerId,
                                testPrompt: 'A simple test image'
                            });
                            
                            console.log('Test result:', result);
                            this.testResults.set(providerId, result);
                            
                            if (result.success) {
                                this.showNotification('success', `Provider test successful: ${result.message}`);
                            } else {
                                this.showNotification('error', `Provider test failed: ${result.error}`);
                                
                                // Log debug information if available
                                if (result.debug) {
                                    console.error('Provider test debug info:', result.debug);
                                }
                            }
                        } catch (error: any) {
                            console.error('Failed to test provider:', error);
                            this.testResults.set(providerId, { success: false, error: error.message });
                            this.showNotification('error', 'Failed to test provider: ' + error.message);
                        } finally {
                            this.isLoading = false;
                        }
                    },

                    // Model Management
                    openModelDialog(model: any = null, providerId = '') {
                        if (model) {
                            this.editingModel = model;
                            this.newModel = {
                                id: model.id,
                                name: model.name,
                                type: model.provider || 'text2img',  // Map provider field back to type
                                providerId: providerId
                            };
                        } else {
                            this.editingModel = null;
                            this.newModel = {
                                id: '',
                                name: '',
                                type: 'text2img',
                                providerId: providerId || ''
                            };
                        }
                        this.showModelDialog = true;
                    },

                    async saveModel() {
                        try {
                            const provider = this.config.imageGeneration.providers.find((p: any) => p.id === this.newModel.providerId);
                            if (!provider) {
                                this.showNotification('error', 'Provider not found');
                                return;
                            }

                            // Convert our form data to the proper model structure
                            const modelData = {
                                id: this.newModel.id || `model_${Date.now()}`,
                                name: this.newModel.name,
                                description: this.newModel.name,
                                provider: this.newModel.type,  // This should match the model interface
                                enabled: true
                            };

                            if (this.editingModel) {
                                // Update existing model
                                const index = provider.models.findIndex((m: any) => m.id === this.editingModel.id);
                                if (index !== -1) {
                                    provider.models[index] = modelData;
                                }
                            } else {
                                // Add new model
                                provider.models.push(modelData);
                            }
                            await this.saveConfig();
                            this.showModelDialog = false;
                        } catch (error) {
                            console.error('Failed to save model:', error);
                            this.showNotification('error', 'Failed to save model');
                        }
                    },

                    async deleteModel(providerId: string, modelId: string) {
                        try {
                            const provider = this.config.imageGeneration.providers.find((p: any) => p.id === providerId);
                            if (provider) {
                                provider.models = provider.models.filter((m: any) => m.id !== modelId);
                                await this.saveConfig();
                                this.showNotification('success', 'Model deleted successfully');
                            }
                        } catch (error) {
                            console.error('Failed to delete model:', error);
                            this.showNotification('error', 'Failed to delete model');
                        }
                    },

                    async fetchModels(provider: any) {
                        this.isLoading = true;
                        try {
                            console.log('Fetching models for provider:', provider.id);
                            const result = await Editor.Message.request('cocos-mcp', 'fetch-provider-models', {
                                providerId: provider.id
                            });
                            
                            console.log('Fetch models result:', result);
                            
                            if (result.success && result.models) {
                                // Update the provider with fetched models, all enabled by default
                                provider.models = result.models.map((model: any) => ({
                                    id: model.id,
                                    name: model.name || model.id,
                                    description: model.description || `${provider.name} model`,
                                    provider: provider.type, // Use the provider's type
                                    enabled: true // Enable all fetched models by default
                                }));
                                
                                await this.saveConfig();
                                this.showNotification('success', `Fetched ${result.models.length} models from ${provider.name}. You can now enable/disable individual models.`);
                                console.log('Successfully fetched and saved models:', result.models);
                            } else {
                                this.showNotification('error', result.error || 'Failed to fetch models');
                                
                                // Log debug information if available
                                if (result.debug) {
                                    console.error('Fetch models debug info:', result.debug);
                                }
                            }
                        } catch (error: any) {
                            console.error('Failed to fetch models:', error);
                            this.showNotification('error', 'Failed to fetch models: ' + (error.message || error));
                        } finally {
                            this.isLoading = false;
                        }
                    },

                    async toggleAllModels(provider: any, enabled: boolean) {
                        if (provider.models) {
                            provider.models.forEach((model: any) => {
                                model.enabled = enabled;
                            });
                            await this.saveConfig();
                            this.showNotification('success', `${enabled ? 'Enabled' : 'Disabled'} all models for ${provider.name}`);
                        }
                    },

                    // Configuration Management
                    async exportConfig() {
                        try {
                            // Create a clean export object without Vue reactivity or non-serializable data
                            const exportData = {
                                imageGeneration: {
                                    providers: JSON.parse(JSON.stringify(this.config.imageGeneration.providers)),
                                    defaultProvider: this.config.imageGeneration.defaultProvider,
                                    globalSettings: {
                                        timeout: this.config.imageGeneration.globalSettings.timeout,
                                        retries: this.config.imageGeneration.globalSettings.retries,
                                        quality: this.config.imageGeneration.globalSettings.quality
                                    }
                                }
                            };
                            
                            const config = JSON.stringify(exportData, null, 2);
                            const blob = new Blob([config], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'ai-config.json';
                            a.click();
                            URL.revokeObjectURL(url);
                            this.showNotification('success', 'Configuration exported successfully');
                        } catch (error) {
                            console.error('Failed to export config:', error);
                            this.showNotification('error', 'Failed to export configuration');
                        }
                    },

                    async importConfig(event: Event) {
                        const input = event.target as HTMLInputElement;
                        const file = input.files?.[0];
                        if (!file) return;

                        try {
                            const text = await file.text();
                            const importedData = JSON.parse(text);
                            
                            // Handle different import formats
                            if (importedData.imageGeneration) {
                                // Full config format
                                this.config.imageGeneration = {
                                    providers: importedData.imageGeneration.providers || [],
                                    defaultProvider: importedData.imageGeneration.defaultProvider || '',
                                    globalSettings: importedData.imageGeneration.globalSettings || {
                                        timeout: 30000,
                                        retries: 3,
                                        quality: 'high'
                                    }
                                };
                            } else if (importedData.providers) {
                                // Direct config format
                                this.config.imageGeneration = {
                                    providers: importedData.providers || [],
                                    defaultProvider: importedData.defaultProvider || '',
                                    globalSettings: {
                                        timeout: importedData.timeout || 30000,
                                        retries: importedData.retries || 3,
                                        quality: importedData.quality || 'high'
                                    }
                                };
                            } else {
                                throw new Error('Invalid configuration format');
                            }
                            
                            await this.saveConfig();
                            this.showNotification('success', 'Configuration imported successfully');
                            
                            // Reset file input
                            input.value = '';
                        } catch (error) {
                            console.error('Failed to import config:', error);
                            this.showNotification('error', 'Failed to import configuration: ' + (error instanceof Error ? error.message : 'Invalid file format'));
                            
                            // Reset file input
                            input.value = '';
                        }
                    },

                    async resetConfig() {
                        if (confirm('Are you sure you want to reset the configuration to defaults? This will remove all providers and models.')) {
                            try {
                                await Editor.Message.request('cocos-mcp', 'reset-image-config');
                                await this.loadConfig();
                                this.showNotification('success', 'Configuration reset to defaults');
                            } catch (error) {
                                console.error('Failed to reset config:', error);
                                this.showNotification('error', 'Failed to reset configuration');
                            }
                        }
                    },

                    // Utility Methods
                    showNotification(type: string, message: string) {
                        this.notification = {
                            show: true,
                            type,
                            message
                        };
                        setTimeout(() => {
                            this.notification.show = false;
                        }, 5000);
                    },

                    getProviderIcon(type: string) {
                        const icons: Record<string, string> = {
                            'stable-diffusion': '🎨',
                            'automatic1111': '🚀',
                            'dall-e': '🤖',
                            'custom': '⚙️'
                        };
                        return icons[type] || '🔧';
                    }
                },

                template: `
                    <div class="ai-config-panel">
                        <div class="panel-header">
                            <h2>🎨 AI Image Generation Configuration</h2>
                            <div class="header-actions">
                                <button @click="loadConfig()" :disabled="isLoading" class="btn btn-secondary">
                                    <span v-if="isLoading">🔄</span>
                                    <span v-else>🔄</span>
                                    Refresh
                                </button>
                                <button @click="exportConfig()" class="btn btn-secondary">📤 Export</button>
                                <label class="btn btn-secondary">
                                    📥 Import
                                    <input type="file" @change="importConfig" accept=".json" style="display: none">
                                </label>
                                <button @click="resetConfig()" class="btn btn-danger">🔄 Reset</button>
                            </div>
                        </div>

                        <!-- Notification -->
                        <div v-if="notification.show" :class="'notification notification-' + notification.type">
                            {{ notification.message }}
                        </div>

                        <!-- Loading Overlay -->
                        <div v-if="isLoading" class="loading-overlay">
                            <div class="spinner"></div>
                            <div>Loading...</div>
                        </div>

                        <!-- Providers Section -->
                        <div class="section">
                            <div class="section-header">
                                <h3>🔧 Providers</h3>
                                <button @click="openProviderDialog()" class="btn btn-primary">+ Add Provider</button>
                            </div>
                            
                            <div v-if="config.imageGeneration.providers && config.imageGeneration.providers.length === 0" class="empty-state">
                                <p>No providers configured. Add your first AI image generation provider to get started.</p>
                            </div>
                            
                            <div v-else-if="config.imageGeneration.providers && config.imageGeneration.providers.length > 0" class="providers-grid">
                                <div v-for="provider in config.imageGeneration.providers" :key="provider.id" class="provider-card">
                                    <div class="provider-header">
                                        <span class="provider-icon">{{ getProviderIcon(provider.type) }}</span>
                                        <h4>{{ provider.name }}</h4>
                                        <div class="provider-actions">
                                            <button @click="testProvider(provider.id)" class="btn btn-sm btn-secondary">🧪 Test</button>
                                            <button @click="openProviderDialog(provider)" class="btn btn-sm btn-secondary">✏️ Edit</button>
                                            <button @click="deleteProvider(provider.id)" class="btn btn-sm btn-danger">🗑️ Delete</button>
                                        </div>
                                    </div>
                                    <div class="provider-details">
                                        <p><strong>Type:</strong> {{ provider.type }}</p>
                                        <p><strong>URL:</strong> {{ provider.baseUrl || provider.config?.baseUrl || 'Not configured' }}</p>
                                        <p><strong>Models:</strong> 
                                            <span v-if="provider.models && provider.models.length > 0">
                                                {{ provider.models.filter(m => m.enabled).length }} enabled / {{ provider.models.length }} total
                                            </span>
                                            <span v-else>0</span>
                                        </p>
                                        <div v-if="testResults.has(provider.id)" :class="'test-result test-' + (testResults.get(provider.id).success ? 'success' : 'error')">
                                            <div class="test-summary">
                                                {{ testResults.get(provider.id).success ? '✅ Connection successful' : '❌ Connection failed' }}
                                            </div>
                                            <div v-if="testResults.get(provider.id).message" class="test-message">
                                                {{ testResults.get(provider.id).message }}
                                            </div>
                                            <div v-if="!testResults.get(provider.id).success && testResults.get(provider.id).error" class="test-error">
                                                <strong>Error:</strong> {{ testResults.get(provider.id).error }}
                                            </div>
                                            <div v-if="testResults.get(provider.id).debug" class="test-debug">
                                                <details>
                                                    <summary>🔍 Debug Information</summary>
                                                    <pre>{{ JSON.stringify(testResults.get(provider.id).debug, null, 2) }}</pre>
                                                </details>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Models for this provider -->
                                    <div class="models-section">
                                        <div class="models-header">
                                            <strong>Models:</strong>
                                            <div class="models-actions">
                                                <button @click="fetchModels(provider)" class="btn btn-xs btn-info" :disabled="!provider.baseUrl && !provider.config?.baseUrl">
                                                    🔄 Fetch Models
                                                </button>
                                                <button v-if="provider.models && provider.models.length > 0" @click="toggleAllModels(provider, true)" class="btn btn-xs btn-secondary">
                                                    ✅ All
                                                </button>
                                                <button v-if="provider.models && provider.models.length > 0" @click="toggleAllModels(provider, false)" class="btn btn-xs btn-secondary">
                                                    ❌ None
                                                </button>
                                            </div>
                                        </div>
                                        <div v-if="provider.models && provider.models.length > 0" class="models-list">
                                            <div v-for="model in provider.models" :key="model.id" class="model-item checkbox-style">
                                                <label class="model-checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        v-model="model.enabled" 
                                                        @change="saveConfig()"
                                                        class="model-checkbox"
                                                    />
                                                    <span class="model-info">
                                                        <strong>{{ model.name }}</strong>
                                                        <small v-if="model.description">{{ model.description }}</small>
                                                        <small class="model-id">ID: {{ model.id }}</small>
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                        <div v-else class="empty-models">
                                            <p>No models available.</p>
                                            <p v-if="provider.baseUrl || provider.config?.baseUrl">
                                                Click "Fetch Models" to discover available models from your API.
                                            </p>
                                            <p v-else>
                                                Configure the Base URL first, then click "Fetch Models".
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Global Settings Section -->
                        <div class="section">
                            <h3>⚙️ Global Settings</h3>
                            <div class="settings-grid">
                                <div class="setting-item">
                                    <label>Default Provider:</label>
                                    <select v-model="config.imageGeneration.defaultProvider">
                                        <option value="">Select a provider...</option>
                                        <option v-for="provider in (config.imageGeneration.providers || [])" :key="provider.id" :value="provider.id">
                                            {{ provider.name }}
                                        </option>
                                    </select>
                                </div>
                                <div class="setting-item">
                                    <label>Request Timeout (ms):</label>
                                    <input type="number" v-model.number="config.imageGeneration.globalSettings.timeout" min="1000" max="300000">
                                </div>
                                <div class="setting-item">
                                    <label>Max Retries:</label>
                                    <input type="number" v-model.number="config.imageGeneration.globalSettings.retries" min="0" max="10">
                                </div>
                                <div class="setting-item">
                                    <label>Default Quality:</label>
                                    <select v-model="config.imageGeneration.globalSettings.quality">
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="ultra">Ultra</option>
                                    </select>
                                </div>
                            </div>
                            <button @click="saveConfig()" class="btn btn-primary">💾 Save Global Settings</button>
                        </div>

                        <!-- Provider Dialog -->
                        <div v-if="showProviderDialog" class="dialog-overlay" @click="showProviderDialog = false">
                            <div class="dialog" @click.stop>
                                <div class="dialog-header">
                                    <h3>{{ editingProvider ? 'Edit' : 'Add' }} Provider</h3>
                                    <button @click="showProviderDialog = false" class="btn btn-sm btn-secondary">✕</button>
                                </div>
                                <div class="dialog-body">
                                    <div class="form-group">
                                        <label>Provider ID:</label>
                                        <input type="text" v-model="newProvider.id" :disabled="!!editingProvider" placeholder="unique-provider-id">
                                    </div>
                                    <div class="form-group">
                                        <label>Name:</label>
                                        <input type="text" v-model="newProvider.name" placeholder="Provider Name">
                                    </div>
                                    <div class="form-group">
                                        <label>Type:</label>
                                        <select v-model="newProvider.type">
                                            <option value="stable-diffusion">Stable Diffusion</option>
                                            <option value="automatic1111">AUTOMATIC1111</option>
                                            <option value="dall-e">OpenAI DALL-E</option>
                                            <option value="custom">Custom Provider</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Base URL:</label>
                                        <input type="url" v-model="newProvider.baseUrl" placeholder="https://api.provider.com">
                                    </div>
                                    <div class="form-group">
                                        <label>API Key:</label>
                                        <input type="password" v-model="newProvider.apiKey" placeholder="API Key (optional)">
                                    </div>
                                </div>
                                <div class="dialog-footer">
                                    <button @click="showProviderDialog = false" class="btn btn-secondary">Cancel</button>
                                    <button @click="saveProvider()" class="btn btn-primary">{{ editingProvider ? 'Update' : 'Add' }} Provider</button>
                                </div>
                            </div>
                        </div>

                        <!-- Model Dialog -->
                        <div v-if="showModelDialog" class="dialog-overlay" @click="showModelDialog = false">
                            <div class="dialog" @click.stop>
                                <div class="dialog-header">
                                    <h3>{{ editingModel ? 'Edit' : 'Add' }} Model</h3>
                                    <button @click="showModelDialog = false" class="btn btn-sm btn-secondary">✕</button>
                                </div>
                                <div class="dialog-body">
                                    <div class="form-group">
                                        <label>Model ID:</label>
                                        <input type="text" v-model="newModel.id" :disabled="!!editingModel" placeholder="model-identifier">
                                    </div>
                                    <div class="form-group">
                                        <label>Name:</label>
                                        <input type="text" v-model="newModel.name" placeholder="Model Display Name">
                                    </div>
                                    <div class="form-group">
                                        <label>Provider:</label>
                                        <select v-model="newModel.providerId" :disabled="!!editingModel">
                                            <option v-for="provider in (config.imageGeneration.providers || [])" :key="provider.id" :value="provider.id">
                                                {{ provider.name }}
                                            </option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Type:</label>
                                        <select v-model="newModel.type">
                                            <option value="text2img">Text to Image</option>
                                            <option value="img2img">Image to Image</option>
                                            <option value="inpainting">Inpainting</option>
                                            <option value="outpainting">Outpainting</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="dialog-footer">
                                    <button @click="showModelDialog = false" class="btn btn-secondary">Cancel</button>
                                    <button @click="saveModel()" class="btn btn-primary">{{ editingModel ? 'Update' : 'Add' }} Model</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            }));

            app.mount(this.$.app);
            panelDataMap.set(this, app);
        }
    },
    beforeClose() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
            panelDataMap.delete(this);
        }
    },
});
