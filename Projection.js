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
  DoubleSide
} from 'three'

import ProjectedMaterial from 'three-projected-material'

export default class Projection {
  camera
  layers
  material = {}
  helper = {}
  renderer
  scene
  renderTarget
  plane
  texture
  textureSource

  constructor ({
    renderer,
    scene,
    layers = [],
    texture,
    cameraPosition = [0, 1.8, 0],
    cameraRotation = [0, 0, 0, 'YXZ'],
    fov = 60,
    bounds = [100, -100, -100, 100],
    ratio = 16 / 9,
    far = 150,
    orthographic = false,
    textureSource,
    screen
  } = {}) {
    this.renderer = renderer
    this.scene = scene
    this.screen = screen

    const near = 3
    this.layers = layers

    this.camera = orthographic
      ? new OrthographicCamera(...bounds, 0, far)
      : new PerspectiveCamera(fov, ratio, near, far)

    this.camera.position.set(...cameraPosition)
    this.camera.rotation.set(...cameraRotation)

    this.camera.rotation.reorder('YXZ')

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

    if (this.screen) {
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

      this.scene.add(this.plane)

      this.layers.plane = this.plane
      this.updatePlane()
    }
    this.createDepthMap()

    this.texture = texture
    this.textureSource = textureSource

    for (const layer in this.layers) {
      this.material[layer] = new ProjectedMaterial({
        camera: this.camera,
        texture: this.texture,
        color: '#ccc',
        transparent: true,
        depthMap: this.renderTarget.depthTexture
      })

      this.layers[layer].geometry.addGroup(
        0,
        Infinity,
        this.layers[layer].geometry.groups.length
      )
      this.layers[layer].material.push(this.material[layer])
    }

    this.renderToLayer = new Proxy(
      Object.fromEntries(Object.keys(this.layers).map(k => [k, true])),
      {
        set: (target, key, value) => {
          target[key] = value
          this.material[key].visible = value
          if (key === 'plane') this.layers.plane.visible = value
          return true
        }
      }
    )

    this.helper = new CameraHelper(this.camera)
    this.#setHelperColor(0x00ff00)
    this.helper.visible = false
  }

  blur = () => {
    this.helper.visible = false
  }

  focus = () => {
    this.helper.visible = true
  }

  #setHelperColor = color => {
    const c = new Color(color)
    this.helper.setColors(c, c, c, c, c)
  }

  createDepthMap = () => {
    const helperVisible = this.helper.visible
    this.helper.visible = false

    this.scene.overrideMaterial = new MeshBasicMaterial()
    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setRenderTarget(null)
    this.scene.overrideMaterial = null

    this.helper.visible = helperVisible
  }

  updateTexture = texture => {
    for (const layer in this.layers) {
      this.material[layer].texture = texture
    }
    this.update()
  }

  updatePlane = () => {
    if (!this.screen) return
    this.plane.rotation.set(...this.camera.rotation)

    const position = this.camera.isOrthographicCamera
      ? [
          (this.camera.top + this.camera.bottom) / 2,
          this.camera.position.y,
          (this.camera.right + this.camera.left) / 2
        ]
      : this.camera.position

    this.plane.position.set(...position)
    const scale = this.camera.isOrthographicCamera
      ? [
          this.camera.right - this.camera.left,
          this.camera.top - this.camera.bottom
        ]
      : this.camera.getViewSize(this.camera.far, new Vector2())

    this.plane.scale.set(...scale, 1)

    this.plane.translateZ(-this.camera.far + this.camera.far * 0.001)
  }

  update = () => {
    this.createDepthMap()
    this.updatePlane()
    this.helper.update()

    for (const layer in this.layers) {
      this.material[layer].project(this.layers[layer])
    }
  }
}
