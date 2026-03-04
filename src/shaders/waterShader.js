// GLSL Water Fragment Shader for PixiJS Filter
export const waterFragmentSrc = `
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;
uniform vec2 uResolution;

void main(void) {
  vec2 uv = vTextureCoord;
  
  // Sine wave distortion
  float wave1 = sin(uv.x * 12.0 + uTime * 2.0) * 0.008;
  float wave2 = sin(uv.y * 8.0  + uTime * 1.5) * 0.006;
  float wave3 = sin((uv.x + uv.y) * 10.0 + uTime * 2.5) * 0.004;
  
  vec2 distorted = uv + vec2(wave1 + wave3, wave2 + wave3);
  vec4 color = texture2D(uSampler, distorted);
  
  // Shimmer / caustic highlights
  float caustic = sin(uv.x * 20.0 + uTime * 3.0) * sin(uv.y * 15.0 + uTime * 2.0);
  caustic = caustic * 0.5 + 0.5;
  caustic = pow(caustic, 3.0) * 0.25;
  
  // Deep water tint + caustic
  vec3 waterColor = vec3(0.1, 0.4, 0.7);
  vec3 blended = mix(waterColor, color.rgb, 0.6) + vec3(caustic * 0.5, caustic * 0.7, caustic);
  
  gl_FragColor = vec4(blended, 0.92);
}
`;

export const waterVertexSrc = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat3 projectionMatrix;
varying vec2 vTextureCoord;

void main(void) {
  gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
  vTextureCoord = aTextureCoord;
}
`;
