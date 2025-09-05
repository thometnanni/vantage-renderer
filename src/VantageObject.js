import { Group } from 'three'

class VantageObject extends HTMLElement {
  vantageRenderer = null
  model = null
  scene = null
  object = new Group()
  constructor() {
    super()
  }

  static observedAttributes = ['position', 'rotation', 'scale']
  async attributeChangedCallback(name, _oldValue, value) {
    console.log(name, _oldValue, value)
    switch (name) {
      case 'position': {
        const parsed = value.match(/([-0-9]+)/g).map((v) => +v)
        const values = [0, 0, 0].map((v, i) => parsed[i] ?? v)

        this.object.position.set(...values)
        break
      }
      case 'rotation': {
        const parsed = value.match(/([-0-9]+)/g).map((v) => (+v * Math.PI) / 180)
        const values = [0, 0, 0].map((v, i) => parsed[i] ?? v)
        this.object.rotation.set(...values, 'YXZ')
        break
      }
      case 'scale': {
        const parsed = value.match(/([-0-9]+)/g).map((v) => +v)
        const values = [1, 1, 1].map((v, i) => parsed[i] ?? parsed[0] ?? v)
        this.object.scale.set(...values)
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

    this.scene.add(this.object)
    this.vantageRenderer.registerObject(this)
  }

  disconnectedCallback() {
    this.scene.remove(this.object)
    this.vantageRenderer.unregisterObject(this)
  }
}

export { VantageObject }
