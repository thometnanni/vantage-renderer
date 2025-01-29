import { Scene, WebGLRenderer, Vector3, Quaternion } from 'three'
import CameraOperator from '../cameraOperator'
import { loadTexture, parseAttribute, setupScene, setupLights } from './utils'
import Projection from '../Projection'

class VantageRenderer extends HTMLElement {
  root
  scene = new Scene()
  renderer = new WebGLRenderer()
  cameraOperator
  meshes
  bounds
  projections = {}
  controls = false
  mousePressed = true
  lastRotation = null

  constructor () {
    super()
  }

  static observedAttributes = ['scene', 'first-person', 'controls']
  async attributeChangedCallback (name, _oldValue, newValue) {
    const value = parseAttribute(name, newValue)
    switch (name) {
      case 'scene':
        const { base, bounds } = await setupScene(value)
        this.scene.getObjectByName('vantage:base')?.removeFromParent()
        this.scene.add(base)
        this.bounds = bounds
        Object.values(this.projections).forEach(projection => {
          if (projection.bounds == null)
            projection.bounds = { bounds, auto: true }
          projection.createLayers()
          projection.update()
        })
        break
      case 'first-person':
        if (!this.cameraOperator) return
        this.cameraOperator.firstPerson = value
        this.cameraOperator.camera = Object.values(this.projections).find(
          ({ focus }) => focus
        )?.camera
        break
      case 'controls':
        this.controls = value
        if (!this.cameraOperator) return
        this.cameraOperator.controls = value
        break
      default:
        break
    }
  }

  async connectedCallback () {
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setAnimationLoop(this.update)

    this.attachShadow({ mode: 'open' }).appendChild(this.renderer.domElement)

    this.addEventListener('vantage:add-projection', e => {
      this.addProjection(e.detail)
    })
    this.addEventListener('vantage:update-projection', e =>
      this.updateProjection(e.detail)
    )
    this.addEventListener('vantage:remove-projection', e =>
      this.removeProjection(e.detail)
    )

    this.addEventListener('mousedown', e => {
      this.mousePressed = true
      this.lastRotation = null
      this.addEventListener('mouseup', () => (this.mousePressed = false), {
        once: true
      })
    })

    this.cameraOperator = new CameraOperator(this.renderer, {
      firstPerson: parseAttribute(
        'first-person',
        this.attributes['first-person']?.value
      ),
      controls: parseAttribute('controls', this.attributes['controls']?.value),
      domElement: this
    })

    this.cameraOperator.addEventListener('vantage:unlock-first-person', e => {
      this.setAttribute('first-person', 'false')
    })

    this.cameraOperator.addEventListener(
      'vantage:update-focus-camera',
      ({ value }) => {
        if (this.controls !== 'edit' || !this.cameraOperator.firstPerson) return
        const target = Object.values(this.projections).find(
          ({ focus }) => focus
        )
        if (target == null) return
        target.element.setAttribute('rotation', value.join(' '))
      }
    )

    this.scene.add(setupLights())

    console.log('----   READY   ----')
  }

  update = () => {
    this.updateFocusCamera()
    this.renderer.render(this.scene, this.cameraOperator.camera)
  }

  updateFocusCamera = () => {
    if (this.controls !== 'edit' || !this.cameraOperator.firstPerson) return
    const target = Object.values(this.projections).find(({ focus }) => focus)
    if (target == null) return

    const pos = this.cameraOperator.camera.getWorldPosition(new Vector3())

    target.element.setAttribute('position', [...pos].join(' '))
  }

  async addProjection ({ id, attributes, element }) {
    const texture = await loadTexture(attributes.src)

    const width = texture.source.data.videoWidth ?? texture.source.data.width
    const height = texture.source.data.videoHeight ?? texture.source.data.height

    const projection = new Projection({
      id,
      attributes,
      renderer: this.renderer,
      scene: this.scene,
      layers: attributes.layers,
      texture,
      position: attributes.position,
      rotation: attributes.rotation,
      bounds: attributes.bounds ?? this.bounds,
      fov: attributes.fov,
      ratio: width / height,
      far: attributes.far,
      orthographic: attributes.orthographic,
      screen: attributes.screen,
      focus: attributes.focus,
      passThrough: attributes['pass-through'],
      element
    })

    projection.update()
    this.scene.add(projection.helper)

    if (attributes.focus) {
      this.cameraOperator.camera = projection.camera
    }

    this.projections[id] = projection
  }

  async updateProjection ({ id, property, value, oldValue }) {
    const projection = this.projections[id]
    if (projection == null) return
    switch (property) {
      case 'src':
        const texture = await loadTexture(value)
        projection.texture = texture
        break
      case 'bounds':
        projection.bounds = value
          ? { bounds: value, auto: false }
          : { bounds: this.bounds, auto: true }
        break
      case 'focus':
        this.cameraOperator.camera = projection.camera
        projection[property] = value
        break
      default:
        projection[property] = value
      // projection.update()
    }
    // if (projection.focus) {
    //   // console.log('set focus')
    //   this.cameraOperator.camera = projection.camera
    // }
  }

  removeProjection ({ id }) {
    this.projections[id].destroy()
    delete this.projections[id]
  }
}

class VantageProjection extends HTMLElement {
  constructor () {
    super()
    this.root = null
    this.projectionId = null
  }
  static observedAttributes = [
    'src',
    'position',
    'rotation',
    'orthographic',
    'fov',
    'far',
    'screen',
    'layers',
    'bounds',
    'focus',
    'pass-through'
  ]
  async attributeChangedCallback (name, oldValue, value) {
    if (this.projectionId == null) return
    if (name === 'orthographic') {
      this.destroy()
      this.create()
      return
    }
    this.dispatchEvent(
      new CustomEvent('vantage:update-projection', {
        bubbles: true,
        detail: {
          id: this.projectionId,
          property: name,
          value: parseAttribute(name, value),
          oldValue: parseAttribute(name, oldValue)
        }
      })
    )
  }

  async connectedCallback () {
    this.projectionId = crypto.randomUUID().split('-')[0]
    this.vantageRenderer = this.parentElement
    this.create()
  }

  create () {
    const attributes = Object.fromEntries(
      [...this.attributes].map(({ name, value }) => [
        name,
        parseAttribute(name, value)
      ])
    )

    const event = new CustomEvent('vantage:add-projection', {
      bubbles: true,
      detail: {
        id: this.projectionId,
        element: this,
        attributes
      }
    })

    this.dispatchEvent(event)
  }

  disconnectedCallback () {
    this.destroy()
  }

  destroy () {
    const event = new CustomEvent('vantage:remove-projection', {
      bubbles: true,
      detail: {
        id: this.projectionId
      }
    })
    this.vantageRenderer.dispatchEvent(event)
  }
}

customElements.define('vantage-renderer', VantageRenderer)
customElements.define('vantage-projection', VantageProjection)
export default VantageRenderer
