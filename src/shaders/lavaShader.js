export const lavaFragmentSrc = `
precision mediump float;

varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float uTime;

// Simple hash / noise
float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
}

void main(void) {
  vec2 uv = vTextureCoord;
  
  // Flowing lava noise
  float n1 = noise(uv * 4.0 + vec2(uTime * 0.3, uTime * 0.1));
  float n2 = noise(uv * 8.0 - vec2(uTime * 0.2, uTime * 0.15));
  float n  = (n1 * 0.6 + n2 * 0.4);
  
  // Lava color ramp
  vec3 dark   = vec3(0.3, 0.0, 0.0);
  vec3 mid    = vec3(0.8, 0.2, 0.0);
  vec3 bright = vec3(1.0, 0.8, 0.1);

  vec3 lavaCol = mix(dark, mid, smoothstep(0.2, 0.6, n));
  lavaCol = mix(lavaCol, bright, smoothstep(0.6, 0.9, n));

  // Pulsing glow
  float glow = sin(uTime * 2.0 + n * 6.28) * 0.1 + 0.9;
  lavaCol *= glow;
  
  gl_FragColor = vec4(lavaCol, 1.0);
}
`;

export const lavaVertexSrc = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat3 projectionMatrix;
varying vec2 vTextureCoord;

void main(void) {
  gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
  vTextureCoord = aTextureCoord;
}
`;
