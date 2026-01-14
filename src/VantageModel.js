import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VantageObject } from './VantageObject'
import { MeshPhongMaterial } from 'three'

class VantageModel extends VantageObject {
  vantageRenderer = null
  model = null
  scene = null
  isProjectionTarget = true
  useSourceMaterial = false
  baseMaterial = null

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
        this.removeModel()
        this.model = await this.loadModel(value)
        this.addModel()
        break
      }
      default:
        break
    }
  }

  connectedCallback() {
    super.connectedCallback()

    this.addModel()
    this.vantageRenderer.registerModel(this)
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    this.removeModel()
    this.vantageRenderer.unregisterModel(this)
  }

  loadModel = async (src) => {
    const loader = new GLTFLoader()
    const gltf = await new Promise((resolve) =>
      loader.load(
        src,
        (gltf) => resolve(gltf),
        undefined,
        (err) => console.error(err)
      )
    )
    return gltf.scene
  }

  addModel = () => {
    if (this.object == null || this.model == null) return

    if (this.isProjectionTarget) {
      this.model.traverse((object) => {
        if (!object.isMesh) return

        if (this.useSourceMaterial) {
          this.baseMaterial = [object.material].flat()
        } else {
          object.geometry.clearGroups()
          object.geometry.addGroup(0, Infinity, 0)
          this.baseMaterial = [new MeshPhongMaterial({ color: 0xeeeeee })]
        }
        object.material = [...this.baseMaterial]
      })
    }

    this.object.add(this.model)
    this.dispatchEvent(new CustomEvent('vantage:model:add', { bubbles: true, composed: true }))
  }

  removeModel = () => {
    if (this.object == null || this.model == null) return
    this.object.remove(this.model)
  }

  update = () => {
    if (this.model == null) return
    if (this.isProjectionTarget && this.vantageRenderer.needsMaterialIndexUpdate) {
      this.model.traverse((object) => {
        if (!object.isMesh) return
        object.material = [
          ...this.baseMaterial,
          ...[...this.vantageRenderer.projections]
            .sort((a, b) => a.index - b.index)
            .map(({ materials }) => materials[object])
        ]
      })
    }
  }
}

export { VantageModel }
