import {
  PerspectiveCamera,
  CameraHelper,
  WebGLRenderTarget,
  DepthTexture,
  MeshDepthMaterial
} from 'three'
import ProjectedMaterial from 'three-projected-material'

export class VantageProjection extends PerspectiveCamera {
  cameraHelper
  renderTarget
  texture = null
  _materials = new Map()
  _depthMaterial = new MeshDepthMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1.0,
    polygonOffsetUnits: 1.0
  })

  constructor({ texture, fov = 60, near = 1, far = 200, renderTargetSize = 1024 } = {}) {
    super(fov, 1, near, far)

    this.cameraHelper = new CameraHelper(this)
    this.cameraHelper.layers.set(2)

    this.renderTarget = new WebGLRenderTarget(renderTargetSize, renderTargetSize)
    this.renderTarget.depthTexture = new DepthTexture()

    if (texture) this.setTexture(texture)

    this.addEventListener('added', () => {
      const scene = this._getScene()
      if (scene) scene.add(this.cameraHelper)
    })

    this.addEventListener('removed', () => {
      this.cameraHelper.removeFromParent()
    })
  }

  setTexture(texture) {
    this.texture = texture
    const w = texture.image?.videoWidth ?? texture.image?.width ?? 1
    const h = texture.image?.videoHeight ?? texture.image?.height ?? 1
    this.aspect = w / h
    this.updateProjectionMatrix()
    this.cameraHelper.update()
  }

  project(object) {
    object.traverse((child) => {
      if (!child.isMesh) return
      this._applyMaterial(child)
    })
  }

  unproject(object) {
    object.traverse((child) => {
      if (!child.isMesh) return
      const mat = this._materials.get(child)
      if (!mat) return
      const idx = child.material.indexOf(mat)
      if (idx !== -1) child.material.splice(idx, 1)
      this._materials.delete(child)
      mat.dispose()
    })
  }

  update(renderer, scene) {
    if (!this.texture || this._materials.size === 0) return
    this._createDepthMap(renderer, scene)
    for (const [mesh, mat] of this._materials) {
      mat.project(mesh)
    }
  }

  dispose() {
    this.renderTarget.depthTexture.dispose()
    this.renderTarget.dispose()
    this.cameraHelper.dispose()
    for (const mat of this._materials.values()) {
      mat.dispose()
    }
    this._materials.clear()
  }

  _applyMaterial(mesh) {
    if (this._materials.has(mesh)) return
    if (!this.texture) return

    if (!Array.isArray(mesh.material)) {
      mesh.material = [mesh.material]
    }
    if (mesh.geometry.groups.length === 0) {
      mesh.geometry.addGroup(0, Infinity, 0)
    }

    const materialIndex = mesh.material.length
    mesh.geometry.addGroup(0, Infinity, materialIndex)

    const mat = new ProjectedMaterial({
      camera: this,
      texture: this.texture,
      transparent: true,
      textureScale: 1,
      opacity: 1,
      depthMap: this.renderTarget.depthTexture
    })
    mesh.material.push(mat)
    mat.project(mesh)
    this._materials.set(mesh, mat)
  }

  _createDepthMap(renderer, scene) {
    scene.overrideMaterial = this._depthMaterial
    renderer.setRenderTarget(this.renderTarget)
    renderer.render(scene, this)
    renderer.setRenderTarget(null)
    scene.overrideMaterial = null
  }

  _getScene() {
    let obj = this
    while (obj.parent) obj = obj.parent
    return obj.type === 'Scene' ? obj : null
  }
}
