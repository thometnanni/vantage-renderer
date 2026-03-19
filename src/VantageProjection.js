import {
  PerspectiveCamera,
  WebGLRenderTarget,
  DepthTexture,
  MeshDepthMaterial,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial
} from 'three'
import ProjectionMaterial from './ProjectionMaterial'

export class VantageProjection extends PerspectiveCamera {
  isVantageProjection = true
  renderTarget
  texture = null
  _materials = new Map()
  _depthMaterial = new MeshDepthMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1.0,
    polygonOffsetUnits: 1.0
  })
  projectionPlane = null

  constructor({ texture, fov = 60, near = 1, far = 200, renderTargetSize = 1024 } = {}) {
    super(fov, 1, near, far)

    this.renderTarget = new WebGLRenderTarget(renderTargetSize, renderTargetSize)
    this.renderTarget.depthTexture = new DepthTexture()

    this._initProjectionPlane()

    if (texture) this.setTexture(texture)
  }

  setTexture(texture) {
    this.texture = texture
    const w = texture.image?.videoWidth ?? texture.image?.width ?? 1
    const h = texture.image?.videoHeight ?? texture.image?.height ?? 1
    this.aspect = w / h
    this.updateProjectionMatrix()
    if (this.projectionPlane) {
      this.projectionPlane.material.map = texture
      this.projectionPlane.material.needsUpdate = true
      this._updateProjectionPlaneSize()
    }
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
      const entry = this._materials.get(child)
      if (!entry) return
      const { mat, hadGroups } = entry

      const idx = child.material.indexOf(mat)
      if (idx !== -1) {
        // Remove this projection's geometry group
        child.geometry.groups = child.geometry.groups.filter((g) => g.materialIndex !== idx)
        // If we added the initial group (geometry had no groups before), remove it too
        if (!hadGroups) {
          child.geometry.groups = child.geometry.groups.filter((g) => g.materialIndex !== 0)
        }
        // Adjust indices of remaining groups to close the gap left by the splice
        child.geometry.groups.forEach((g) => {
          if (g.materialIndex > idx) g.materialIndex--
        })
        // Remove material from array
        child.material.splice(idx, 1)
        // Unwrap single-element array back to a plain material
        if (child.material.length === 1) child.material = child.material[0]
      }

      this._materials.delete(child)
      mat.dispose()
    })
  }

  update(renderer, scene) {
    if (!this.texture || this._materials.size === 0) return
    this._createDepthMap(renderer, scene)
    for (const [mesh, { mat }] of this._materials) {
      mat.project(mesh)
    }
  }

  dispose() {
    this.renderTarget.depthTexture.dispose()
    this.renderTarget.dispose()
    for (const { mat } of this._materials.values()) {
      mat.dispose()
    }
    this._materials.clear()
    if (this.projectionPlane) {
      this.projectionPlane.geometry.dispose()
      this.projectionPlane.material.dispose()
    }
  }

  _initProjectionPlane() {
    const mat = new MeshBasicMaterial({ map: null, transparent: true, depthWrite: false })
    const geo = new PlaneGeometry(1, 1)
    this.projectionPlane = new Mesh(geo, mat)
    this.projectionPlane.visible = true
    this.projectionPlane.renderOrder = -1
    this.add(this.projectionPlane)
    this._updateProjectionPlaneSize()
  }

  _updateProjectionPlaneSize() {
    if (!this.projectionPlane) return
    const halfFovRad = (this.fov * Math.PI) / 180 / 2
    const h = 2 * this.far * Math.tan(halfFovRad)
    const w = h * this.aspect
    this.projectionPlane.scale.set(w, h, 1)
    this.projectionPlane.position.set(0, 0, -this.far)
  }

  _applyMaterial(mesh) {
    if (this._materials.has(mesh)) return
    if (!this.texture) return

    const hadGroups = mesh.geometry.groups.length > 0

    if (!Array.isArray(mesh.material)) {
      mesh.material = [mesh.material]
    }
    if (!hadGroups) {
      mesh.geometry.addGroup(0, Infinity, 0)
    }

    const materialIndex = mesh.material.length
    mesh.geometry.addGroup(0, Infinity, materialIndex)

    const mat = new ProjectionMaterial({
      camera: this,
      texture: this.texture,
      transparent: true,
      opacity: 1,
      depthMap: this.renderTarget.depthTexture
    })
    mesh.material.push(mat)
    mat.project(mesh)
    this._materials.set(mesh, { mat, hadGroups })
  }

  _createDepthMap(renderer, scene) {
    scene.overrideMaterial = this._depthMaterial
    renderer.setRenderTarget(this.renderTarget)
    renderer.render(scene, this)
    renderer.setRenderTarget(null)
    scene.overrideMaterial = null
  }
}
