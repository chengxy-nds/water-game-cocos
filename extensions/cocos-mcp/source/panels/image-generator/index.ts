/* eslint-disable vue/one-component-per-file */

import { readFileSync } from 'fs-extra';
import { join } from 'path';

const panelDataMap = new WeakMap<any, any>();

module.exports = Editor.Panel.define({
    listeners: {
        show() { 
            console.log('Image Generator Panel: show'); 
        },
        hide() { 
            console.log('Image Generator Panel: hide'); 
        },
    },
    template: readFileSync(join(__dirname, '../../../static/template/image-generator/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/image-generator/index.css'), 'utf-8'),
    $: {
        container: '#image-generator-container',
    },
    methods: {
        /**
         * Generate PNG image from SVG content using Canvas API
         * This method is called from the MCP server tool
         */
        async generateImageFromSVG(svgContent: string): Promise<Buffer> {
            return new Promise((resolve, reject) => {
                try {
                    // Create a new image element
                    const img = new Image();
                    
                    img.onload = () => {
                        try {
                            // Create canvas with appropriate size
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            if (!ctx) {
                                reject(new Error('Failed to get 2D context from canvas'));
                                return;
                            }
                            
                            // Set canvas size (default 512x512, but use image size if available)
                            canvas.width = img.naturalWidth || 512;
                            canvas.height = img.naturalHeight || 512;
                            
                            // Draw the image on canvas
                            ctx.drawImage(img, 0, 0);
                            
                            // Convert canvas to PNG blob
                            canvas.toBlob((blob) => {
                                if (!blob) {
                                    reject(new Error('Failed to convert canvas to blob'));
                                    return;
                                }
                                
                                // Convert blob to buffer
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const arrayBuffer = reader.result as ArrayBuffer;
                                    const buffer = Buffer.from(arrayBuffer);
                                    resolve(buffer);
                                };
                                reader.onerror = () => {
                                    reject(new Error('Failed to read blob as array buffer'));
                                };
                                reader.readAsArrayBuffer(blob);
                            }, 'image/png');
                            
                        } catch (error) {
                            reject(new Error(`Canvas operation failed: ${error}`));
                        }
                    };
                    
                    img.onerror = () => {
                        reject(new Error('Failed to load SVG image'));
                    };
                    
                    // Create data URL from SVG content
                    let svgDataUrl: string;
                    if (svgContent.startsWith('data:')) {
                        // Already a data URL
                        svgDataUrl = svgContent;
                    } else if (svgContent.startsWith('<svg')) {
                        // Raw SVG content - convert to data URL
                        // Encode SVG content for data URL
                        const encodedSvg = encodeURIComponent(svgContent);
                        svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
                    } else {
                        // Assume it's emoji or text content - create simple SVG
                        const simpleSvg = this.createSvgFromText(svgContent);
                        const encodedSvg = encodeURIComponent(simpleSvg);
                        svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
                    }
                    
                    // Load the SVG
                    img.src = svgDataUrl;
                    
                } catch (error) {
                    reject(new Error(`SVG processing failed: ${error}`));
                }
            });
        },
        
        /**
         * Create a simple SVG from text content (especially useful for emojis)
         */
        createSvgFromText(text: string): string {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
                <text x="256" y="400" text-anchor="middle" font-size="400" font-family="system-ui, -apple-system, sans-serif">${text}</text>
            </svg>`;
        },

        /**
         * Process image generation request and close panel when done
         */
        async processImageGeneration(svgContent: string): Promise<Buffer> {
            try {
                const result = await this.generateImageFromSVG(svgContent);
                await Editor.Panel.close('cocos-mcp.image-generator');
                return result;
            } catch (error) {
                await Editor.Panel.close('cocos-mcp.image-generator');
                throw error;
            }
        }
    },
    ready() {
        console.log('Image Generator Panel: ready');
        panelDataMap.set(this, { ready: true });
    },
    beforeClose() { 
        console.log('Image Generator Panel: beforeClose');
    },
    close() {
        console.log('Image Generator Panel: close');
        const data = panelDataMap.get(this);
        if (data) {
            panelDataMap.delete(this);
        }
    },
});
