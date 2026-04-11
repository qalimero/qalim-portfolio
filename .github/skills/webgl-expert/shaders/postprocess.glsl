// Fullscreen quad vertex shader
attribute vec2 aPosition;
varying vec2 vTexCoord;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
  vTexCoord = aPosition * 0.5 + 0.5;
}

// Grayscale fragment shader
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D uTexture;

void main() {
  vec4 color = texture2D(uTexture, vTexCoord);
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(vec3(gray), color.a);
}
