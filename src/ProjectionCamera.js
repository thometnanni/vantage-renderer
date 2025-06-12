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
  MeshDepthMaterial,
  Object3D
} from 'three'

import ProjectedMaterial from 'three-projected-material'
import { getScene } from './utils'

export default class ProjectionCamera extends Object3D {
  isProjectionCamera = true
  renderer
  scene
  camera
  cameraHelper
  texture
  plane
  renderTarget
  overrideMaterial
  depthMaterial = new MeshDepthMaterial({
    polygonOffset: true,
    polygonOffsetFactor: 1.0,
    polygonOffsetUnits: 1.0
  })

  constructor({
    renderer,
    texture,
    fov = 60,
    ratio = 16 / 9,
    far = 200,
    near = 1,
    textureSource,
    screen = true,
    focus = true,
    opacity = 1
  } = {}) {
    super()

    this.renderer = renderer

    this.camera = new PerspectiveCamera(fov, ratio, near, far)

    this.add(this.camera)

    this.cameraHelper = new CameraHelper(this.camera)
    this.cameraHelper.layers.set(2)
    const scene = getScene(this)
    if (scene != null) scene.add(this.cameraHelper)

    this.addEventListener('added', () => {
      this.scene = getScene(this)
      if (this.scene != null) {
        this.scene.add(this.cameraHelper)
        this.createDepthMap()
      }
    })

    this.plane = new Mesh(new PlaneGeometry(1, 1), [])
    this.plane.geometry.addGroup(0, Infinity, 0)

    this.add(this.plane)

    this.updatePlane()

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

    this.plane.material.push(
      new MeshBasicMaterial({
        transparent: true,
        opacity: 1,
        color: 0xffffff,
        side: DoubleSide
        // map: this.renderTarget.depthTexture
      })
    )

    // this.plane.material[0] = new MeshBasicMaterial({ map: this.renderTarget.texture })

    // this.createDepthMap()

    // this.texture = texture
    // this.textureSource = textureSource
    // this.opacity = opacity

    // this.createLayers()
    // this.screen = screen

    // this.helper = new CameraHelper(this.camera)
    // this.helper.layers.set(2)
    // this.focus = focus
    // this.ready = true
  }

  updatePlane = () => {
    if (this.plane == null) return

    this.plane.position.set(0, 0, 0)
    const scale =
      this.projectionType === 'map'
        ? [this.camera.right - this.camera.left, this.camera.top - this.camera.bottom]
        : this.camera.getViewSize(this.camera.far, new Vector2())

    this.plane.scale.set(...scale, 1)

    this.plane.translateZ(-this.camera.far + this.camera.far * 0.001)
  }

  createDepthMap = () => {
    // this.plane.visible = false
    // this.scene.overrideMaterial = new MeshDepthMaterial({
    //   polygonOffset: true,
    //   polygonOffsetFactor: 1.0,
    //   polygonOffsetUnits: 1.0
    // })
    this.scene.overrideMaterial = this.depthMaterial
    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.render(this.scene, this.camera)
    this.renderer.setRenderTarget(null)
    this.scene.overrideMaterial = null

    // this.plane.visible = true
  }
}
