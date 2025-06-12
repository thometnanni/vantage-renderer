import { MapControls } from 'three/addons/controls/MapControls'
// import { loadTexture, parseAttribute, setupScene, setupLights, getSelectedKeyframe } from './utils'

class VantageMapControls extends HTMLElement {
  controls
  enabled
  constructor() {
    super()
  }

  static observedAttributes = ['disabled']
  async attributeChangedCallback(name, _oldValue, value) {
    switch (name) {
      case 'disabled': {
        this.enabled = value === 'false' || value == null
        if (this.controls != null) this.controls.enabled = this.enabled
        break
      }
      default:
        break
    }
  }

  connectedCallback() {
    if (!this.closest('vantage-renderer'))
      throw 'VantageMapControls: missing <vantage-renderer> parent'

    const { renderer, camera } = this.closest('vantage-renderer')
    this.controls = new MapControls(camera, renderer.domElement)
    this.controls.minDistance = 10
    this.controls.maxDistance = 1000
    this.controls.enabled = this.enabled
  }

  disconnectedCallback() {
    this.controls.dispose()
    console.log(this.controls)
  }
}

export { VantageMapControls }
