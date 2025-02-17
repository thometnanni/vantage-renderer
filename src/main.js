import { Scene, WebGLRenderer, Vector2, Vector3, Group } from 'three'
import CameraOperator from './cameraOperator'
import { loadTexture, parseAttribute, setupScene, setupLights } from './utils'
import Projection from './Projection'

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
  mouse = new Vector2()

  constructor() {
    super()
  }

  static observedAttributes = ['scene', 'first-person', 'controls']

  async attributeChangedCallback(name, _oldValue, newValue) {
    const value = parseAttribute(name, newValue)
    switch (name) {
      case 'scene': {
        const { base, bounds } = await setupScene(value)
        this.scene.getObjectByName('vantage:base')?.removeFromParent()
        this.scene.add(base)
        this.bounds = bounds
        Object.values(this.projections).forEach((projection) => {
          if (projection.bounds == null) projection.bounds = { bounds, auto: true }
          projection.createLayers()
          projection.update()
        })
        break
      }
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

  async connectedCallback() {
    this.renderer.setPixelRatio(window.devicePixelRatio)

    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.innerHTML = `:host {display: block; height: 100%; width: 100%; overflow: hidden}`
    shadow.appendChild(style)

    this.renderer.domElement.style = 'display: block; width: 100%; height: 100%;'
    shadow.appendChild(this.renderer.domElement)

    this.renderer.domElement.addEventListener('pointermove', (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      if (this.cameraOperator) {
        this.cameraOperator.updateMouse(event)
      }
    })

    this.renderer.setAnimationLoop(this.update)

    this.resizeObserver = new ResizeObserver((entries) => this.resizeCanvas(entries[0].contentRect))
    this.resizeObserver.observe(this.renderer.domElement)

    this.addEventListener('vantage:add-projection', (e) => this.addProjection(e.detail))
    this.addEventListener('vantage:update-projection', (e) => this.updateProjection(e.detail))
    this.addEventListener('vantage:remove-projection', (e) => this.removeProjection(e.detail))

    this.addEventListener('mousedown', () => {
      this.mousePressed = true
      this.lastRotation = null
      this.addEventListener('mouseup', () => (this.mousePressed = false), { once: true })
    })

    this.cameraOperator = new CameraOperator(this.renderer, {
      mapCameraPosition: [-100, 50, 50],
      domElement: this,
      scene: this.scene,
      firstPerson: parseAttribute('first-person', this.attributes['first-person']?.value),
      controls: parseAttribute('controls', this.attributes['controls']?.value)
    })

    this.cameraOperator.addEventListener('vantage:unlock-first-person', () => {
      this.setAttribute('first-person', 'false')
      this.dispatchEvent(
        new CustomEvent('vantage:unlock-first-person', {
          bubbles: true
        })
      )
    })

    this.cameraOperator.addEventListener('vantage:update-focus-camera', ({ value }) => {
      if (this.controls !== 'edit' || !this.cameraOperator.firstPerson) return
      const target = Object.values(this.projections).find(({ focus }) => focus)
      if (target == null) return
      target.element.setAttribute('rotation', value.join(' '))
      target.element.dispatchEvent(
        new CustomEvent('vantage:set-rotation', {
          bubbles: true,
          detail: {
            rotation: value
          }
        })
      )
    })

    const screens = new Group()
    screens.name = 'vantage:screens'
    this.scene.add(setupLights(), screens)

    // this.renderer.domElement.addEventListener('click', () => {
    //   this.cameraOperator.focusOnCamera(this.projections)
    // })
  }

  resizeCanvas({ width, height }) {
    if (width > 0 && height > 0) {
      this.renderer.setSize(width, height, false)

      if (this.cameraOperator?.camera?.isPerspectiveCamera) {
        this.cameraOperator.camera.aspect = width / height
        this.cameraOperator.camera.updateProjectionMatrix()
      }

      if (this.cameraOperator?.camera) {
        this.renderer.render(this.scene, this.cameraOperator.camera)
      }
    }
  }

  update = () => {
    this.updateFocusCamera()
    const focusProjection = Object.values(this.projections).find(({ focus }) => focus)
    if (focusProjection && focusProjection.ready) {
      this.cameraOperator.focusMarker.visible = true
      this.cameraOperator.focusMarker.position.copy(focusProjection.camera.position)
      if (!this.cameraOperator.dragControls) {
        this.cameraOperator.initDragControls(this.projections)
      }
    } else {
      if (this.cameraOperator.focusMarker) {
        this.cameraOperator.focusMarker.visible = false
      }
      if (this.cameraOperator.dragControls) {
        this.cameraOperator.dragControls.dispose()
        this.cameraOperator.dragControls = null
      }
    }
    this.renderer.render(this.scene, this.cameraOperator.camera)
  }

  updateFocusCamera = () => {
    if (this.controls !== 'edit' || !this.cameraOperator.firstPerson) return
    const target = Object.values(this.projections).find(({ focus }) => focus)
    if (target == null) return
    const pos = this.cameraOperator.camera.getWorldPosition(new Vector3())
    target.element.setAttribute('position', [...pos].join(' '))
    target.element.dispatchEvent(
      new CustomEvent('vantage:set-position', {
        bubbles: true,
        detail: {
          position: [...pos]
        }
      })
    )
  }

  async addProjection({ id, attributes, element }) {
    const texture = await loadTexture(attributes.src)

    const width = texture.source.data.videoWidth ?? texture.source.data.width
    const height = texture.source.data.videoHeight ?? texture.source.data.height

    const index = Array.prototype.indexOf.call(this.children, element)
    Object.values(this.projections).forEach((projection) => {
      if (projection.index >= index) projection.index
    })

    const projection = new Projection({
      id,
      index,
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
      projectionType: attributes['projection-type'],
      screen: attributes.screen,
      focus: attributes.focus,
      opacity: attributes.opacity,
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

  async updateProjection({ id, property, value }) {
    const projection = this.projections[id]
    if (projection == null) return
    switch (property) {
      case 'src': {
        const texture = await loadTexture(value)
        projection.texture = texture
        break
      }
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
    }
  }

  removeProjection({ id }) {
    const index = this.projections[id].index

    this.projections[id].destroy()
    delete this.projections[id]

    Object.values(this.projections).forEach((projection) => {
      if (projection.index > index) projection.index--
    })
  }
}

class VantageProjection extends HTMLElement {
  constructor() {
    super()
    this.root = null
    this.projectionId = null
  }
  static observedAttributes = [
    'src',
    'position',
    'rotation',
    'projection-type',
    'fov',
    'far',
    'screen',
    'layers',
    'bounds',
    'focus',
    'opacity',
    'pass-through'
  ]
  async attributeChangedCallback(name, oldValue, value) {
    if (this.projectionId == null) return
    if (name === 'projection-type') {
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

  async connectedCallback() {
    this.projectionId = this.id ?? crypto.randomUUID().split('-')[0]
    this.vantageRenderer = this.parentElement
    this.create()
  }

  create() {
    const attributes = Object.fromEntries(
      [...this.attributes].map(({ name, value }) => [name, parseAttribute(name, value)])
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

  disconnectedCallback() {
    this.destroy()
  }

  destroy() {
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
