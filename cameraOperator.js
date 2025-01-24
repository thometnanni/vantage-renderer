import { PerspectiveCamera, Vector3, Quaternion } from 'three'

import { MapControls } from 'three/addons/controls/MapControls'
import { PointerLockControls } from './CustomPointerLockControls'

export default class CameraOperator {
  mapCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000)
  fpCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000)
  mapControls
  projection
  #firstPerson

  constructor (
    renderer,
    { mapCameraPosition = [250, 500, 0], firstPerson, domElement }
  ) {
    // this.renderer = renderer
    this.mapCamera.position.set(...mapCameraPosition)
    // if (mapCameraRotation) {
    //   this.mapCamera.rotation.set(mapCameraRotation)
    // }

    this.mapCamera.rotation.set(Math.PI / 2, 0, 0, 'YXZ')

    this.mapControls = new MapControls(this.mapCamera, renderer.domElement)
    this.mapControls.minDistance = 10
    this.mapControls.maxDistance = 1000
    // this.mapControls.target = new Vector3(0, 0, 0)

    this.fpControls = new PointerLockControls(
      this.fpCamera,
      // renderer.domElement
      domElement
      // this.domElement
    )

    this.fpControls.addEventListener('unlock', () => {
      console.log('unlock')
      this.map()
    })

    this.fpControls.addEventListener('change', (e, a, b) => {
      if (this.fpControls.attachedCamera != null) this.projection.update()
    })

    this.fpControls.enabled = false

    this.firstPerson = firstPerson
    document.addEventListener('keydown', this.keydown)
    document.addEventListener('mousedown', this.mousedown)
  }

  get camera () {
    return this.mapControls.enabled ? this.mapCamera : this.fpCamera
  }

  set firstPerson (firstPerson) {
    console.log('first persopn', firstPerson)
    if (firstPerson) this.fp()
    else this.map()
  }

  get firstPerson () {
    return this.#firstPerson
  }

  map () {
    console.log('map', this.mapControls.enabled)
    if (this.mapControls.enabled) return

    this.mapControls.enabled = true
    this.fpControls.enabled = false
    this.fpControls.unlock()
    // this.projection = null;
  }

  fp () {
    console.log('fp', this.fpControls.enabled)
    if (this.fpControls.enabled) return

    this.mapControls.enabled = false
    this.fpControls.enabled = true
    this.fpControls.lock()
  }

  toggle = () => {
    console.log('toggle')
    if (this.mapControls.enabled) this.fp()
    else this.map()
  }

  attachProjection = (projection, reverse) => {
    this.detachProjection()
    const source = reverse ? this.fpCamera : projection.camera
    const target = reverse ? projection.camera : this.fpCamera

    const pos = source.getWorldPosition(new Vector3())
    const quat = source.getWorldQuaternion(new Quaternion())
    target.position.set(...pos)
    target.setRotationFromQuaternion(quat)
    target.updateProjectionMatrix()

    this.projection = projection
    this.projection.focus()

    if (reverse) this.projection.update()
  }

  detachProjection = () => {
    this.projection?.blur()
    this.projection = null
  }

  keydown = ({ code, key, shiftKey }) => {
    // if (code === "Enter") {
    //   this.toggle();
    // }

    // if (this.mapControls.enabled) return;

    switch (code) {
      case 'KeyQ':
        this.fpCamera.translateY(-1)
        break

      case 'KeyW':
        this.fpCamera.translateZ(-1)
        break

      case 'KeyE':
        this.fpCamera.translateY(1)
        break

      case 'KeyA':
        this.fpCamera.translateX(-1)
        break

      case 'KeyS':
        this.fpCamera.translateZ(1)
        break

      case 'KeyD':
        this.fpCamera.translateX(1)
        break
    }

    if (this.projection != null) {
      switch (code) {
        case 'ArrowUp':
          this.projection.camera.isOrthographicCamera
            ? (this.projection.camera.zoom += 0.01)
            : this.projection.camera.fov++
          break

        case 'ArrowLeft':
          this.projection.camera.rotateZ(0.02)
          break

        case 'ArrowDown':
          this.projection.camera.isOrthographicCamera
            ? (this.projection.camera.zoom -= 0.01)
            : this.projection.camera.fov--
          break

        case 'ArrowRight':
          this.projection.camera.rotateZ(-0.02)
          break
      }
      this.projection.camera.position.set(
        ...this.fpCamera.getWorldPosition(new Vector3())
      )
      this.projection.update()
    }
  }

  mousedown = e => {
    if (!this.fpControls.enabled || this.projection == null) return
    this.fpControls.attachCamera(this.projection.camera)
    window.addEventListener('mouseup', () => this.fpControls.detachCamera(), {
      once: true
    })
  }
}
