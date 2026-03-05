import { VantageProjection } from './VantageProjection.js'

export class VantageProjectionExporterPlugin {
  constructor(writer) {
    this.writer = writer
  }

  async writeNode(object, nodeDef) {
    if (!object.isVantageProjection || !object.texture) return
    const textureIndex = await this.writer.processTextureAsync(object.texture)
    nodeDef.extras = { ...(nodeDef.extras ?? {}), vantageProjection: { textureIndex } }
  }
}

export class VantageProjectionLoaderPlugin {
  constructor(parser) {
    this.parser = parser
  }

  async afterRoot(gltf) {
    const candidates = []
    gltf.scene.traverse((obj) => {
      if (obj.isPerspectiveCamera && obj.userData.vantageProjection != null) {
        candidates.push(obj)
      }
    })

    for (const cam of candidates) {
      const { textureIndex } = cam.userData.vantageProjection
      const texture = await this.parser.getDependency('texture', textureIndex)

      // GLTFLoader creates ImageBitmap images, which lack the naturalWidth/naturalHeight/clientWidth
      // properties that three-projected-material's computeScaledDimensions relies on.
      // Without these, sourceWidth = 0 → ratio = NaN → heightScaled = NaN → single-row distortion.
      const img = texture.image
      if (img && img.width && !img.naturalWidth) {
        img.naturalWidth = img.width
        img.naturalHeight = img.height
      }

      // GLTFLoader sets flipY=false (GLTF spec), but three-projected-material's shader maps
      // clip-space Y→V assuming the standard WebGL bottom-up convention (flipY=true).
      texture.flipY = true
      texture.needsUpdate = true

      const projection = new VantageProjection({ texture, fov: cam.fov, near: cam.near, far: cam.far })
      projection.position.copy(cam.position)
      projection.quaternion.copy(cam.quaternion)
      projection.scale.copy(cam.scale)
      projection.name = cam.name
      projection.userData = { ...cam.userData }
      delete projection.userData.vantageProjection

      cam.parent?.add(projection)
      cam.parent?.remove(cam)
    }
  }
}
