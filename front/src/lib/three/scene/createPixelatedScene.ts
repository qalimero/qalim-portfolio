import * as THREE from 'three';
import { UniformsConfig } from '../config/uniforms';
import vertexSrc from '../shaders/vertex.glsl?raw';
import fragmentSrc from '../shaders/fragment.glsl?raw';

export interface PixelatedSceneConfig {
  container: HTMLElement;
  uniforms: UniformsConfig;
}

export class PixelatedScene {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.OrthographicCamera;
  public material: THREE.ShaderMaterial;
  public mesh: THREE.Mesh;
  private uniforms: UniformsConfig;

  constructor(config: PixelatedSceneConfig) {
    this.uniforms = config.uniforms;
    this.setupRenderer(config.container);
    this.setupScene();
    this.setupCamera();
    this.setupMaterial();
    this.setupMesh();
    this.setupResizeHandler();
  }

  private setupRenderer(container: HTMLElement): void {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2')!;
    
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      context: gl, 
      antialias: true 
    });
    
    container.appendChild(canvas);
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
  }

  private setupCamera(): void {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  private setupMaterial(): void {
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexSrc,
      fragmentShader: fragmentSrc,
      uniforms: this.uniforms,
      glslVersion: THREE.GLSL3,
      transparent: true,
    });
  }

  private setupMesh(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
  }

  private setupResizeHandler(): void {
    const resize = () => {
      const canvas = this.renderer.domElement;
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      
      this.renderer.setSize(w, h, false);
      this.uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener('resize', resize);
    resize(); // Initial resize
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.setupResizeHandler);
  }
}
