export interface SceneConfig {
  shape: string;
  pixelSize: number;
  inkColor: string;
}

export function getSceneConfigFromElement(elementId: string = 'hero_bg'): SceneConfig {
  const element = document.getElementById(elementId);
  
  const shape = element?.getAttribute('data-shape') ?? 'square';
  const pixelSizeAttr = element?.getAttribute('data-pixel-size') ?? '4';
  const inkColor = element?.getAttribute('data-ink') ?? '#FFFFFF';
  
  return {
    shape,
    pixelSize: parseFloat(pixelSizeAttr) || 4,
    inkColor,
  };
}
