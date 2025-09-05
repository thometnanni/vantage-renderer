class VantageKeyframe extends HTMLElement {
  vantageRenderer = null
  time = 0
  attribute = null
  value = null
  ease = 'linear'
  constructor() {
    super()
  }

  static observedAttributes = ['time', 'attribute', 'value', 'ease']
  async attributeChangedCallback(name, _oldValue, value) {
    switch (name) {
      case 'time': {
        this.time = +(value || 0)
        break
      }
      case 'ease': {
        this.ease = value || 'linear'
        break
      }
      default:
        this[name] = value
    }
  }

  connectedCallback() {
    this.vantageRenderer = this.closest('vantage-renderer')

    if (!this.vantageRenderer) throw 'VantageModel: missing <vantage-renderer> parent'
    this.scene = this.vantageRenderer.scene

    this.vantageRenderer.registerKeyframe(this)
  }

  disconnectedCallback() {
    this.vantageRenderer.unregisterKeyframe(this)
  }
}

export { VantageKeyframe }
