import {
  LineBasicMaterial,
  MeshPhongMaterial,
  Scene,
  WebGLRenderer,
  LineSegments,
  EdgesGeometry,
  DirectionalLight,
  AmbientLight,
  Box3
} from 'three'
import CameraOperator from '../cameraOperator'
import { loadTexture, loadScene, unpackMeshes } from './utils'
import Projection from '../Projection'

class VantageRenderer extends HTMLElement {
  root
  scene = new Scene()
  sceneUrl
  renderer = new WebGLRenderer()
  cameraOperator
  solidMaterial = new MeshPhongMaterial({ color: 0xeeeeee })
  lineMaterial = new LineBasicMaterial({ color: 0xaaaaaa })
  meshes
  bounds
  projections = {}
  projectionsData = {}

  constructor () {
    super()
  }

  static observedAttributes = ['scene']
  async attributeChangedCallback (name, _oldValue, value) {
    switch (name) {
      case 'scene':
        this.sceneUrl = value
        break
      default:
        break
    }
  }

  async connectedCallback () {
    this.root = this.attachShadow({ mode: 'closed' })
    this.root.appendChild(this.renderer.domElement)

    this.addEventListener('vantage:attach-projection', e =>
      this.attachProjection(e.detail)
    )
    this.addEventListener('vantage:update-projection', e => console.log(e))

    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setAnimationLoop(this.update)

    this.cameraOperator = new CameraOperator(this.renderer)

    this.meshes = unpackMeshes(await loadScene(this.sceneUrl))

    this.meshes.forEach(mesh => {
      // reset materials
      mesh.geometry.clearGroups()
      mesh.geometry.addGroup(0, Infinity, 0)
      mesh.material = [this.solidMaterial]

      // create wireframe
      this.scene.add(
        new LineSegments(new EdgesGeometry(mesh.geometry), this.lineMaterial)
      )
    })

    this.scene.add(...this.meshes)

    const bbox = new Box3().setFromObject(this.scene)
    this.bounds = [bbox.max.z, bbox.min.z, bbox.min.x, bbox.max.x]

    console.log(this.bounds)

    console.log('scene ready')

    for (const id in this.projectionsData) {
      this.addProjection(id, this.projectionsData[id])
    }

    // lights
    const dirLight1 = new DirectionalLight(0xffffff, 3)
    dirLight1.position.set(1, 1, 1)
    this.scene.add(dirLight1)

    const dirLight2 = new DirectionalLight(0xffffff, 3)
    dirLight2.position.set(-1, -1, -1)
    this.scene.add(dirLight2)

    const ambientLight = new AmbientLight(0xffffff, 0.8)
    this.scene.add(ambientLight)
  }

  update = () => {
    this.renderer.render(this.scene, this.cameraOperator.camera)
  }

  attachProjection ({ id, attributes }) {
    this.projectionsData[id] = attributes
  }

  async addProjection (id, attributes) {
    const texture = await loadTexture(attributes.src)

    const width = texture.source.data.videoWidth ?? texture.source.data.width
    const height = texture.source.data.videoHeight ?? texture.source.data.height

    console.log(
      attributes.layers,
      this.meshes.filter(
        ({ name }) =>
          attributes.layers == null || attributes.layers.includes(name)
      ),
      this.meshes
    )

    const projection = new Projection({
      renderer: this.renderer,
      scene: this.scene,
      layers: this.meshes.filter(
        ({ name }) =>
          attributes.layers == null || attributes.layers.includes(name)
      ),
      // layers: Object.fromEntries(meshes.map(m => [m.name, m])),
      texture,
      cameraPosition: attributes.position,
      cameraRotation: attributes.rotation,
      bounds: attributes.bounds ?? this.bounds,
      fov: attributes.fov,
      ratio: width / height,
      far: attributes.far,
      orthographic: attributes.orthographic,
      screen: attributes.screen
    })

    projection.update()
    this.scene.add(projection.helper)

    this.projections[id] = projection
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
    'screen'
  ]
  async attributeChangedCallback (name, oldValue, value) {
    if (this.projectionId == null) return
    this.dispatchEvent(
      new CustomEvent('vantage:update-projection', {
        bubbles: true,
        detail: {
          id: this.projectionId,
          name,
          value: parseAttribute(name, value),
          oldValue: parseAttribute(name, oldValue)
        }
      })
    )
  }

  async connectedCallback () {
    this.projectionId = crypto.randomUUID().split('-')[0]

    const attributes = Object.fromEntries(
      [...this.attributes].map(({ name, value }) => [
        name,
        parseAttribute(name, value)
      ])
    )

    const event = new CustomEvent('vantage:attach-projection', {
      bubbles: true,
      detail: {
        id: this.projectionId,
        attributes
      }
    })

    this.dispatchEvent(event)
  }
}

function parseAttribute (name, value) {
  switch (name) {
    case 'position':
      return value.split(' ').map(v => +v)
    case 'rotation':
      return [...value.split(' ').map(v => +v), 'YXZ']
    case 'layers':
      return [...value.matchAll(/'([^']+)'|"([^"]+)"|([^ ]+)/g)].map(
        d => d[1] ?? d[2] ?? d[3]
      )
    case 'fov':
    case 'far':
      return +value
    case 'orthographic':
    case 'screen':
      return value === '' || value === 'true'
    default:
      return value
  }
}

customElements.define('vantage-renderer', VantageRenderer)
customElements.define('vantage-projection', VantageProjection)
export default VantageRenderer
