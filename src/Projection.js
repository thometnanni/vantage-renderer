import {
  PerspectiveCamera,
  CameraHelper,
  Color,
  WebGLRenderTarget,
  FloatType,
  DepthTexture,
  MeshBasicMaterial,
  NearestFilter,
  RGBAFormat,
  Mesh,
  PlaneGeometry,
  Vector2,
  OrthographicCamera,
  DoubleSide,
  MeshDepthMaterial
} from 'three'

import ProjectedMaterial from 'three-projected-material'

export default class Projection {
  camera
  #layers
  #layerNames
  #bounds
  #texture
  #screen
  material = {}
  helper = {}
  renderer
  scene
  renderTarget
  plane
  textureSource
  attributes
  id
  ready = false
  #focus
  #opacity
  #index

  constructor({
    renderer,
    scene,
    layers,
    texture,
    position = [0, 1.8, 0],
    rotation = [0, 0, 0, 'YXZ'],
    fov = 60,
    bounds,
    ratio = 16 / 9,
    far,
    near = 1,
    projectionType = 'perspective',
    textureSource,
    screen,
    attributes,
    id,
    focus,
    opacity,
    element,
    index
  } = {}) {
    this.id = id
    this.renderer = renderer
    this.scene = scene

    this.#bounds = bounds

    this.element = element
    this.attributes = attributes

    // this.updateLayerMeshes()

    this.index = index
    this.projectionType = projectionType
    far = far ?? (this.projectionType === 'map' ? 501 : 150)
    if (this.projectionType === 'map') {
      this.camera = new OrthographicCamera(...(bounds ?? [100, -100, -100, 100]), 0, far)
      this.position = [0, 500, 0]
      this.rotation = [-Math.PI / 2, -Math.PI / 2, 0, 'YXZ']
    } else if (this.projectionType === 'orthographic') {
      // to do
      this.position = position
      this.rotation = rotation
    } else {
      this.camera = new PerspectiveCamera(fov, ratio, near, far)
      this.position = position
      this.rotation = rotation
    }

    this.renderTarget = new WebGLRenderTarget(2000, 2000)
    this.renderTarget.texture.format = RGBAFormat
    this.renderTarget.texture.minFilter = NearestFilter
    this.renderTarget.texture.magFilter = NearestFilter
    this.renderTarget.texture.generateMipmaps = false
    this.renderTarget.stencilBuffer = false
    this.renderTarget.depthTexture = new DepthTexture()
    this.renderTarget.depthBuffer = true
    this.renderTarget.depthTexture = new DepthTexture()
    this.renderTarget.depthTexture.type = FloatType

    // this.createDepthMap()

    this.texture = texture
    this.textureSource = textureSource
    this.opacity = opacity

    this.createLayers()
    this.screen = screen
    this.layers = layers

    this.helper = new CameraHelper(this.camera)
    this.#setHelperColor(0x00ff00)
    this.focus = focus
    this.ready = true
  }

  set index(index) {
    this.#index = index + 1
    Object.keys(this.material).forEach((layer) => {
      if (layer === 'vantage-renderer') return
      this.#layers[layer].material[index + 1] = this.material[layer]
    })
  }

  get index() {
    return this.#index - 1
  }

  set layers(layers) {
    this.#layerNames = layers
    this.updateLayers()
  }

  get layers() {
    return this.#layerNames
  }

  set bounds({ bounds, auto }) {
    if (this.projectionType !== 'map' || bounds == null) return
    if (!auto) this.#bounds = bounds
    this.camera.left = bounds[0]
    this.camera.right = bounds[1]
    this.camera.top = bounds[2]
    this.camera.bottom = bounds[3]
    this.update()
  }

  get bounds() {
    return this.#bounds
  }

  set position(position) {
    this.camera.position.set(...position)
    this.update()
  }

  get position() {
    return this.camera.position
  }

  set rotation(rotation) {
    this.camera.rotation.set(...rotation)
    this.update()
  }

  get rotation() {
    return this.camera.rotation
  }

  set fov(fov) {
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
    this.update()
  }

  get fov() {
    return this.camera.fov
  }

  set far(far) {
    this.camera.far = far
    this.camera.updateProjectionMatrix()
    this.update()
  }

  get far() {
    return this.camera.far
  }

  set texture(texture) {
    this.#texture = texture
    for (const layer in this.#layers) {
      this.material[layer].texture = texture
    }
    this.update()
  }

  get texture() {
    return this.#texture
  }

  set screen(screen) {
    this.#screen = screen === true
    if (this.plane) this.plane.visible = this.#screen
    this.update()
  }

  get screen() {
    return this.#screen
  }

  set focus(focus) {
    this.#focus = focus
    this.helper.visible = focus === true
  }

  get focus() {
    return this.#focus
  }

  set opacity(opacity) {
    this.#opacity = opacity || 1
    Object.values(this.material).forEach((m) => {
      m.transparent = true
      m.opacity = opacity
      m.needsUpdate = true
    })
  }

  get opacity() {
    return this.#opacity
  }

  #setHelperColor = (color) => {
    const c = new Color(color)
    this.helper.setColors(c, c, c, c, c)
  }

  createDepthMap = () => {
    const helperVisible = this.helper.visible
    this.helper.visible = false

    const planeCopy = this.plane.clone()
    this.scene.add(planeCopy)

    this.scene.getObjectByName('vantage:screens').visible = false

    const depthMaterial = new MeshDepthMaterial({
      polygonOffset: true,
      polygonOffsetFactor: 1.0,
      polygonOffsetUnits: 1.0
    })

    // this.scene.overrideMaterial = new MeshBasicMaterial()
    this.scene.overrideMaterial = depthMaterial
    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setRenderTarget(null)
    this.scene.overrideMaterial = null

    this.helper.visible = helperVisible
    this.scene.getObjectByName('vantage:screens').visible = true

    this.scene.remove(planeCopy)
  }

  // updateTexture = texture => {
  //   for (const layer in this.#layers) {
  //     this.material[layer].texture = texture
  //   }
  //   this.update()
  // }

  updatePlane = () => {
    if (this.plane == null) return
    this.plane.rotation.set(...this.camera.rotation)

    const position =
      this.projectionType === 'map'
        ? [
            (this.camera.top + this.camera.bottom) / 2,
            this.camera.position.y,
            (this.camera.right + this.camera.left) / 2
          ]
        : this.camera.position

    this.plane.position.set(...position)
    const scale =
      this.projectionType === 'map'
        ? [this.camera.right - this.camera.left, this.camera.top - this.camera.bottom]
        : this.camera.getViewSize(this.camera.far, new Vector2())

    this.plane.scale.set(...scale, 1)

    this.plane.translateZ(-this.camera.far + this.camera.far * 0.001)
  }

  update = () => {
    if (!this.ready || this.scene.getObjectByName('vantage:base') == null) return
    this.updatePlane()
    this.createDepthMap()
    this.helper.update()

    for (const layer in this.#layers) {
      this.material[layer].project(this.#layers[layer])
    }
  }

  createLayers() {
    this.#layers = Object.fromEntries(
      this.scene
        .getObjectByName('vantage:base')
        ?.children.filter(({ isMesh }) => isMesh)
        .map((layer) => [layer.name, layer]) ?? []
    )

    if (this.plane == null) {
      this.plane = new Mesh(new PlaneGeometry(1, 1), [])
      this.plane.geometry.addGroup(0, Infinity, 0)
      this.plane.material.push(
        new MeshBasicMaterial({
          transparent: true,
          opacity: 0.9,
          color: 0xffffff,
          side: DoubleSide
        })
      )
      this.plane.renderOrder = 1
      this.scene.getObjectByName('vantage:screens').add(this.plane)
    }

    this.#layers['vantage:screen'] = this.plane

    for (const layer in this.#layers) {
      this.material[layer] = new ProjectedMaterial({
        camera: this.camera,
        texture: this.texture,
        transparent: true,
        opacity: this.opacity,
        depthMap: this.renderTarget.depthTexture
      })

      this.#layers[layer].geometry.addGroup(0, Infinity, this.#layers[layer].geometry.groups.length)
      if (layer === 'vantage:screen') {
        this.#layers[layer].material.push(this.material[layer])
      } else {
        this.#layers[layer].material[this.#index] = this.material[layer]
      }
    }

    this.updateLayers()
  }

  updateLayers = () => {
    Object.entries(this.#layers).forEach(([layerName]) => {
      if (layerName === 'vantage:screen') return
      this.material[layerName].visible =
        this.#layerNames == null || this.#layerNames.includes(layerName)
    })
  }

  destroy() {
    Object.values(this.material).forEach((material) => {
      material.visible = false
      material.dispose()
    })
    this.texture.dispose()
    this.camera.removeFromParent()
    this.plane?.removeFromParent()
    this.helper.removeFromParent()
  }
}
