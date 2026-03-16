export function patchShader(shader, { defines = '', header = '', main = '', ...replaces }) {
  let patchedShader = shader

  const replaceAll = (str, find, rep) => str.split(find).join(rep)
  Object.keys(replaces).forEach((key) => {
    patchedShader = replaceAll(patchedShader, key, replaces[key])
  })

  patchedShader = patchedShader.replace(
    'void main() {',
    `
    ${header}
    void main() {
      ${main}
    `
  )

  const stringDefines = Object.keys(defines)
    .map((d) => `#define ${d} ${defines[d]}`)
    .join('\n')

  return `
    ${stringDefines}
    ${patchedShader}
  `
}

// run the callback when the texture will be loaded
export function addLoadListener(texture, callback) {
  // For regular images, videoWidth/videoHeight are undefined, so we only
  // need texture.image to be truthy. For videos, we need the actual pixel
  // dimensions to be non-zero (meaning metadata has loaded).
  function isLoaded() {
    if (!texture.image) return false
    const isRegularImage = texture.image.videoWidth === undefined
    const isLoadedVideo = texture.image.videoWidth > 0 && texture.image.videoHeight > 0
    return isRegularImage || isLoadedVideo
  }

  if (isLoaded()) return

  const interval = setInterval(() => {
    if (isLoaded()) {
      clearInterval(interval)
      callback(texture)
    }
  }, 16)
}

// scale to keep the image proportions (contain fit, perspective camera only)
export function computeScaledDimensions(texture, camera) {
  if (!texture.image) return [1, 1]

  // return if it's a video and the video hasn't loaded yet
  if (texture.image.videoWidth === 0 && texture.image.videoHeight === 0) return [1, 1]

  const sourceWidth =
    texture.image.naturalWidth || texture.image.videoWidth || texture.image.width
  const sourceHeight =
    texture.image.naturalHeight || texture.image.videoHeight || texture.image.height

  const ratio = sourceWidth / sourceHeight
  const ratioCamera = camera.aspect

  if (ratio < ratioCamera) {
    return [ratioCamera / ratio, 1]
  } else {
    return [1, ratio / ratioCamera]
  }
}
