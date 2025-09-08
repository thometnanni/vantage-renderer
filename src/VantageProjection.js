import { getCameraFrustum, loadTexture, getMeshes } from './utils'
import ProjectionCamera from './ProjectionCamera'
import { Mesh, SphereGeometry, Texture, Vector3, MeshPhongMaterial } from 'three'
import ProjectedMaterial from 'three-projected-material'
import { VantageObject } from './VantageObject'
import { MeshBasicMaterial } from 'three'

class VantageProjection extends VantageObject {
  projection = null
  frustum
  texture
  constructor() {
    super()
  }

  static get observedAttributes() {
    return [...super.observedAttributes, 'src']
  }
  async attributeChangedCallback(name, oldValue, value) {
    await super.attributeChangedCallback(name, oldValue, value)
    if (oldValue === value) return
    switch (name) {
      case 'src': {
        this.removeProjection()
        this.texture = await loadTexture(value)
        this.addProjection()
        break
      }
      default:
        break
    }
  }

  connectedCallback() {
    super.connectedCallback()

    this.addProjection()
    this.vantageRenderer.registerProjection(this)
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    this.removeProjection()
    this.vantageRenderer?.unregisterProjection(this)
  }

  addProjection = async () => {
    if (this.scene == null || this.texture == null) return

    // this.texture = await loadTexture(this.getAttribute('src'))

    const width = this.texture.image.videoWidth ?? this.texture.image.width
    const height = this.texture.image.videoHeight ?? this.texture.image.height

    this.projection = new ProjectionCamera({
      renderer: this.vantageRenderer.renderer,
      texture: this.texture,
      ratio: width / height
    })

    // this.projection.position.set(100, 10, 0)
    // this.projection.rotation.set(-Math.PI / 8, -Math.PI / 2, 0, 'YXZ')
    // this.projection.updatePlane()

    this.object.add(this.projection)

    this.vantageRenderer.addEventListener('vantage:model:add', () => {
      this.projection.createDepthMap()
      this.vantageRenderer.models.forEach((vantageModel) => {
        console.log(vantageModel.model)
        vantageModel.model.traverse((mesh) => {
          if (!mesh.isMesh) return
          mesh.geometry.clearGroups()
          mesh.geometry.addGroup(0, Infinity, 0)
          mesh.material = [new MeshPhongMaterial({ color: 0xeeeeee })]
          mesh.geometry.addGroup(0, Infinity, 1)
          const material = new ProjectedMaterial({
            camera: this.projection.camera,
            texture: this.texture,
            transparent: true,
            opacity: 1,
            depthMap: this.projection.renderTarget.depthTexture
          })

          // this.material[layer].project(this.#layers[layer])
          mesh.material.push(material)

          material.project(mesh)
        })
      })

      const material = new ProjectedMaterial({
        camera: this.projection.camera,
        texture: this.texture,
        transparent: true,
        opacity: 1,
        depthMap: this.projection.renderTarget.depthTexture
      })
      this.projection.plane.geometry.addGroup(0, Infinity, 1)
      this.projection.plane.material.push(material)
      material.project(this.projection.plane)
    })

    // const sphere = new Mesh(new SphereGeometry(25))
    // this.scene.add(sphere)

    // sphere.position.set(100, 100, 0)

    // console.log(
    //   this.projection.plane.position,
    //   this.projection.plane.getWorldPosition(new Vector3())
    // )
  }

  removeProjection() {}

  update() {
    if (this.projection == null) return
    if (this.modified || this.frustum == null) {
      this.frustum = getCameraFrustum(this.projection.camera)
    }

    const needsProjectionUpdate =
      this.modified ||
      [...this.vantageRenderer.models].find(
        (model) =>
          model.isProjectionTarget &&
          model.modified &&
          getMeshes(model.model).find((mesh) => this.frustum.intersectsObject(mesh))
      )

    if (needsProjectionUpdate) {
      this.projection.createDepthMap()

      const targets = [...this.vantageRenderer.models]
        .filter((model) => model.isProjectionTarget)
        .map((model) =>
          getMeshes(model.model).filter((mesh) => this.frustum.intersectsObject(mesh))
        )
        .flat()

      targets.forEach((target) => {
        target.material.forEach((material) => material.project?.(target))
      })
    }
  }
}

export { VantageProjection }
