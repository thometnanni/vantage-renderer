import { loadTexture } from './utils'
import ProjectionCamera from './ProjectionCamera'
import { Mesh, SphereGeometry, Texture, Vector3, MeshPhongMaterial } from 'three'
import ProjectedMaterial from 'three-projected-material'
import { VantageObject } from './VantageObject'

class VantageProjection extends VantageObject {
  projection = null
  texture = new Texture()
  constructor() {
    super()
  }

  static get observedAttributes() {
    return [...super.observedAttributes, 'src']
  }
  async attributeChangedCallback(name, _oldValue, value) {
    await super.attributeChangedCallback(name, _oldValue, value)
    switch (name) {
      case 'src': {
        // this.removeModel()
        console.log('src', value)
        this.texture = await loadTexture(value)
        // this.addModel()
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
    this.vantageRenderer?.unregisterProjection(this)
    // this.removeModel()
  }

  addProjection = async () => {
    if (this.scene == null) return

    this.texture = await loadTexture(this.getAttribute('src'))
    // console.log(this.texture)

    this.projection = new ProjectionCamera({
      renderer: this.vantageRenderer.renderer,
      texture: this.texture
    })

    // this.projection.position.set(100, 10, 0)
    // this.projection.rotation.set(-Math.PI / 8, -Math.PI / 2, 0, 'YXZ')
    // this.projection.updatePlane()

    this.object.add(this.projection)

    this.vantageRenderer.addEventListener('vantage:model:add', () => {
      this.projection.createDepthMap()
      this.vantageRenderer.models.forEach((vantageModel) => {
        console.log(vantageModel.model)
        vantageModel.model.children
          .filter(({ isMesh }) => isMesh)
          .forEach((mesh) => {
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

    console.log(
      this.projection.plane.position,
      this.projection.plane.getWorldPosition(new Vector3())
    )
  }
}

export { VantageProjection }
