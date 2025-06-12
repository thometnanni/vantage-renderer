import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

class VantageModel extends HTMLElement {
  vantageRenderer = null
  model = null
  scene = null
  constructor() {
    super()
  }

  static observedAttributes = ['src']
  async attributeChangedCallback(name, _oldValue, value) {
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
    this.vantageRenderer = this.closest('vantage-renderer')
    if (!this.vantageRenderer) throw 'VantageModel: missing <vantage-renderer> parent'
    this.scene = this.vantageRenderer.scene

    this.addModel()
    this.vantageRenderer.registerModel(this)
  }

  disconnectedCallback() {
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
    if (this.scene == null || this.model == null) return
    this.scene.add(this.model)
    this.dispatchEvent(new CustomEvent('vantage:model:add', { bubbles: true, composed: true }))
  }

  removeModel = () => {
    if (this.scene == null || this.model == null) return
    this.scene.remove(this.model)
  }
}

export { VantageModel }
