import { PerspectiveCamera, Vector3, Quaternion, EventDispatcher } from 'three'

import { MapControls } from 'three/addons/controls/MapControls'
import { PointerLockControls } from './CustomPointerLockControls'

export default class CameraOperator extends EventDispatcher {
  mapCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000)
  fpCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000)
  mapControls
  projection
  #firstPerson
  #controls
  #focusCamera

  constructor (
    renderer,
    { mapCameraPosition = [250, 500, 0], domElement, firstPerson, controls }
  ) {
    super()
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
      this.map()
      this.dispatchEvent({ type: 'vantage:unlock-first-person' })
    })

    this.fpControls.addEventListener('change', (e, a, b) => {
      // if (this.fpControls.attachedCamera != null) this.projection.update()
    })

    this.fpControls.enabled = false

    this.firstPerson = firstPerson
    this.controls = controls
    document.addEventListener('keydown', this.keydown)
    document.addEventListener('mousedown', this.mousedown)
  }

  set camera (camera) {
    this.#focusCamera = camera
    if (!this.#firstPerson || camera == null) return

    const pos = camera.getWorldPosition(new Vector3())
    const quat = camera.getWorldQuaternion(new Quaternion())

    this.fpCamera.position.set(...pos)
    this.fpCamera.setRotationFromQuaternion(quat)
    this.fpCamera.updateProjectionMatrix()
  }

  get camera () {
    return !this.#firstPerson ? this.mapCamera : this.fpCamera
  }

  set firstPerson (firstPerson) {
    this.#firstPerson = firstPerson
    if (firstPerson) this.fp()
    else this.map()
  }

  get firstPerson () {
    return this.#firstPerson
  }

  set controls (controls) {
    if (controls) {
      if (this.firstPerson) this.fp()
      else this.map()
    }
    // else this.map()
    this.#controls = controls
  }

  get controls () {
    return this.#controls
  }

  map () {
    if (!this.controls || this.mapControls.enabled) return

    this.mapControls.enabled = true
    this.fpControls.enabled = false
    this.fpControls.unlock()
    // this.projection = null;
  }

  fp () {
    if (!this.controls || this.fpControls.enabled) return

    this.mapControls.enabled = false
    this.fpControls.enabled = true
    this.fpControls.lock()
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
    if (!this.controls) return
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
    if (!this.fpControls.enabled || this.#focusCamera == null) return
    this.fpControls.attachCamera(this.#focusCamera)
    window.addEventListener(
      'mouseup',
      () => {
        this.fpControls.detachCamera()
        this.dispatchEvent({
          type: 'vantage:update-focus-camera',
          value: [...this.#focusCamera.rotation].slice(0, -1)
        })
      },
      {
        once: true
      }
    )
  }
}
