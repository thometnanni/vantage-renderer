export const vertexShaderHeader = /* glsl */ `
  uniform mat4 viewMatrixCamera;
  uniform mat4 projectionMatrixCamera;
  uniform mat4 savedModelMatrix;

  varying vec3 vSavedNormal;
  varying vec4 vTexCoords;
  varying vec4 vWorldPosition;
`

export const vertexShaderMain = /* glsl */ `
  vSavedNormal = mat3(savedModelMatrix) * normal;
  vTexCoords = projectionMatrixCamera * viewMatrixCamera * savedModelMatrix * vec4(position, 1.0);
  vWorldPosition = savedModelMatrix * vec4(position, 1.0);
`

export const fragmentShaderHeader = /* glsl */ `
  uniform sampler2D projectedTexture;
  uniform sampler2D depthMap;
  uniform bool isTextureLoaded;
  uniform bool isTextureProjected;
  uniform vec3 projPosition;
  uniform vec3 projDirection;
  uniform float widthScaled;
  uniform float heightScaled;
  uniform mat4 projectionMatrixCamera;

  varying vec3 vSavedNormal;
  varying vec4 vTexCoords;
  varying vec4 vWorldPosition;

  float mapRange(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
  }
`

export const fragmentShaderReplace = /* glsl */ `
  // clamp the w to make sure we don't project behind
  float w = max(vTexCoords.w, 0.0);

  vec2 uv = (vTexCoords.xy / w) * 0.5 + 0.5;
  #ifdef STOP_PROPAGATION
  vec2 uvDepthMap = uv;
  #endif

  // apply the corrected width and height
  uv.x = mapRange(uv.x, 0.0, 1.0, 0.5 - widthScaled / 2.0, 0.5 + widthScaled / 2.0);
  uv.y = mapRange(uv.y, 0.0, 1.0, 0.5 - heightScaled / 2.0, 0.5 + heightScaled / 2.0);

  // this makes sure we don't sample out of the texture
  bool isInTexture = (max(uv.x, uv.y) <= 1.0 && min(uv.x, uv.y) >= 0.0);

  // this makes sure we don't render also the back of the object
  vec3 projectorDirection = normalize(projPosition - vWorldPosition.xyz);
  float dotProduct = dot(vSavedNormal, projectorDirection);

  bool isFacingProjector = dotProduct > 0.0000001;

  bool isInShadow = false;
  #ifdef STOP_PROPAGATION
    vec4 depthMapColor = texture2D(depthMap, uvDepthMap);

    float depth = depthMapColor.x;

    float z_ndc = 2.0 * depth - 1.0;

    float a = projectionMatrixCamera[2][2];
    float b = projectionMatrixCamera[3][2];
    float z_eye = b / (a + z_ndc);

    isInShadow = vTexCoords.w > z_eye + 0.1 || depth == 1.0;
  #endif

  vec4 diffuseColor = vec4(diffuse, 0);

  if (isFacingProjector && isInTexture && isTextureLoaded && isTextureProjected && !isInShadow) {
    vec4 textureColor = texture2D(projectedTexture, uv);
    // apply the material opacity
    textureColor.a *= opacity;

    // https://learnopengl.com/Advanced-OpenGL/Blending
    diffuseColor = textureColor * textureColor.a + diffuseColor * (1.0 - textureColor.a);
  }
`
