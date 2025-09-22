import * as THREE from 'three';
import { createUniforms } from './config/uniforms';
import { getSceneConfigFromElement } from './config/sceneConfig';
import { PixelatedScene } from './scene/createPixelatedScene';
import { ClickHandler } from './interactions/clickHandler';

export interface PixelatedBackgroundConfig {
  containerId?: string;
}

export class PixelatedBackground {
  private scene: PixelatedScene;
  private clickHandler: ClickHandler;
  private clock: THREE.Clock;
  private animationId: number | null = null;

  constructor(config: PixelatedBackgroundConfig = {}) {
    const containerId = config.containerId || 'hero_bg';
    const container = document.getElementById(containerId);
    
    if (!container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    // Get configuration from HTML attributes
    const sceneConfig = getSceneConfigFromElement(containerId);
    
    // Create uniforms
    const uniforms = createUniforms(
      sceneConfig.inkColor,
      sceneConfig.shape,
      sceneConfig.pixelSize
    );

    // Initialize scene
    this.scene = new PixelatedScene({
      container,
      uniforms,
    });

    // Initialize click handler
    this.clickHandler = new ClickHandler(uniforms);
    this.clickHandler.setupClickHandler(this.scene.renderer.domElement);

    // Initialize clock
    this.clock = new THREE.Clock();

    // Start animation loop
    this.start();
  }

  private start(): void {
    const animate = () => {
      // Update time uniform
      this.scene.uniforms.uTime.value = this.clock.getElapsedTime();
      
      // Render scene
      this.scene.render();
      
      // Continue animation loop
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public dispose(): void {
    this.stop();
    this.scene.dispose();
    this.clickHandler.reset();
  }

  public resetClicks(): void {
    this.clickHandler.reset();
  }
}

// Export a factory function for easy initialization
export function createPixelatedBackground(config?: PixelatedBackgroundConfig): PixelatedBackground {
  return new PixelatedBackground(config);
}
