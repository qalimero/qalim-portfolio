import * as THREE from 'three';
import { UniformsConfig, MAX_CLICKS } from '../config/uniforms';

export class ClickHandler {
  private clickIndex = 0;
  private uniforms: UniformsConfig;

  constructor(uniforms: UniformsConfig) {
    this.uniforms = uniforms;
  }

  setupClickHandler(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', (e) => {
      this.handleClick(e, canvas);
    });
  }

  private handleClick(event: PointerEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    const fx = (event.clientX - rect.left) * (canvas.width / rect.width);
    const fy = (rect.height - (event.clientY - rect.top)) * (canvas.height / rect.height);

    this.uniforms.uClickPos.value[this.clickIndex].set(fx, fy);
    this.uniforms.uClickTimes.value[this.clickIndex] = this.uniforms.uTime.value;
    this.clickIndex = (this.clickIndex + 1) % MAX_CLICKS;
  }

  reset(): void {
    this.clickIndex = 0;
    // Reset all click positions to invalid state
    for (let i = 0; i < MAX_CLICKS; i++) {
      this.uniforms.uClickPos.value[i].set(-1, -1);
      this.uniforms.uClickTimes.value[i] = 0;
    }
  }
}
