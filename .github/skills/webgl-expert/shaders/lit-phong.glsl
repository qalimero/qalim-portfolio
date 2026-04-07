// Vertex shader
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec3 vPosition;

void main() {
  vec4 worldPosition = uModelMatrix * vec4(aPosition, 1.0);
  vPosition = worldPosition.xyz;
  vNormal = mat3(uNormalMatrix) * aNormal;
  vTexCoord = aTexCoord;
  gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}

// Fragment shader
precision mediump float;

varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec3 vPosition;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess;
uniform sampler2D uDiffuseTexture;
uniform bool uUseTexture;
uniform vec3 uLightPosition;
uniform vec3 uLightColor;
uniform vec3 uViewPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightPosition - vPosition);
  vec3 viewDir = normalize(uViewPosition - vPosition);
  vec3 ambient = uAmbientColor * uLightColor;
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * uDiffuseColor * uLightColor;
  vec3 halfwayDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfwayDir), 0.0), uShininess);
  vec3 specular = spec * uSpecularColor * uLightColor;
  vec4 texColor = uUseTexture ? texture2D(uDiffuseTexture, vTexCoord) : vec4(1.0);
  vec3 result = (ambient + diffuse + specular) * texColor.rgb;
  gl_FragColor = vec4(result, texColor.a);
}
