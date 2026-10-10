import * as fs from 'fs';
import * as path from 'path';
import { McpServerConfig, DEFAULT_SERVER_CONFIG } from './config.js';

/**
 * Configuration storage manager for persisting MCP server settings
 */
export class ConfigStorage {
    private configPath: string;

    constructor() {
        // Store config in the editor's profile directory
        this.configPath = path.join(Editor.Project.path, '.cocos-mcp-config.json');
    }

    /**
     * Load configuration from disk
     */
    loadConfig(): McpServerConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                const savedConfig = JSON.parse(configData);
                
                // Merge with defaults to ensure all properties exist
                const mergedConfig = {
                    ...DEFAULT_SERVER_CONFIG,
                    ...savedConfig,
                    tools: {
                        ...DEFAULT_SERVER_CONFIG.tools,
                        ...savedConfig.tools
                    },
                    imageGeneration: {
                        ...DEFAULT_SERVER_CONFIG.imageGeneration,
                        ...savedConfig.imageGeneration,
                        providers: savedConfig.imageGeneration?.providers || DEFAULT_SERVER_CONFIG.imageGeneration.providers
                    }
                };
                
                return mergedConfig;
            }
        } catch (error) {
            console.warn('Failed to load MCP config, using defaults:', error);
        }
        
        return { ...DEFAULT_SERVER_CONFIG };
    }

    /**
     * Save configuration to disk
     */
    saveConfig(config: McpServerConfig): boolean {
        try {
            const configData = JSON.stringify(config, null, 2);
            fs.writeFileSync(this.configPath, configData, 'utf8');
            return true;
        } catch (error) {
            console.error('Failed to save MCP config:', error);
            return false;
        }
    }

    /**
     * Check if config file exists
     */
    configExists(): boolean {
        return fs.existsSync(this.configPath);
    }

    /**
     * Delete configuration file
     */
    deleteConfig(): boolean {
        try {
            if (fs.existsSync(this.configPath)) {
                fs.unlinkSync(this.configPath);
            }
            return true;
        } catch (error) {
            console.error('Failed to delete MCP config:', error);
            return false;
        }
    }
}
