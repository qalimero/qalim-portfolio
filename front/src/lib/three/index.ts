// Main exports
export { PixelatedBackground, createPixelatedBackground } from './pixelatedBackground';
export { PixelatedScene } from './scene/createPixelatedScene';
export { ClickHandler } from './interactions/clickHandler';

// Configuration exports
export { createUniforms, SHAPE_MAP, MAX_CLICKS } from './config/uniforms';
export { getSceneConfigFromElement } from './config/sceneConfig';

// Type exports
export type { UniformsConfig } from './config/uniforms';
export type { SceneConfig } from './config/sceneConfig';
export type { PixelatedBackgroundConfig } from './pixelatedBackground';
export type { PixelatedSceneConfig } from './scene/createPixelatedScene';
