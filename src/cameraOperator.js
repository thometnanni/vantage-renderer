import {
  PerspectiveCamera,
  Vector3,
  Quaternion,
  EventDispatcher,
  SphereGeometry,
  MeshBasicMaterial,
  Mesh,
  Raycaster,
  Vector2,
  Plane
} from 'three'
import { MapControls } from 'three/addons/controls/MapControls'
import { PointerLockControls } from './CustomPointerLockControls'
import { DragControls } from 'three/addons/controls/DragControls.js'

export default class CameraOperator extends EventDispatcher {
  mapCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000)
  fpCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000)
  mapControls
  projection
  #firstPerson
  #controls
  #focusCamera
  scene
  domElement
  focusMarker
  dragControls
  mouse = new Vector2()

  constructor(
    renderer,
    { mapCameraPosition = [-100, 50, 50], domElement, scene, firstPerson, controls }
  ) {
    super()
    // this.renderer = renderer
    this.domElement = domElement
    this.scene = scene
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

    this.fpControls.addEventListener('change', () => {
      // if (this.fpControls.attachedCamera != null) this.projection.update()
    })

    this.fpControls.enabled = false

    this.firstPerson = firstPerson
    this.controls = controls
    document.addEventListener('keydown', this.keydown)
    document.addEventListener('mousedown', this.mousedown)
    document.addEventListener('wheel', this.wheel)

    this.createFocusMarker()
  }

  set camera(camera) {
    this.#focusCamera = camera
    if (!this.#firstPerson || camera == null) return

    const pos = camera.getWorldPosition(new Vector3())
    const quat = camera.getWorldQuaternion(new Quaternion())

    this.fpCamera.position.set(...pos)
    this.fpCamera.setRotationFromQuaternion(quat)
    this.fpCamera.updateProjectionMatrix()
  }

  get camera() {
    return !this.#firstPerson ? this.mapCamera : this.fpCamera
  }

  set firstPerson(firstPerson) {
    this.#firstPerson = firstPerson
    if (firstPerson) this.fp()
    else this.map()
  }

  get firstPerson() {
    return this.#firstPerson
  }

  set controls(controls) {
    if (controls) {
      if (this.firstPerson) this.fp()
      else this.map()
    }
    // else this.map()
    this.#controls = controls
  }

  get controls() {
    return this.#controls
  }

  map() {
    if (!this.controls || this.mapControls.enabled) return

    this.mapControls.enabled = true
    this.fpControls.enabled = false
    this.fpControls.unlock()
  }

  fp() {
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

  keydown = ({ code }) => {
    if (!this.controls) return
    // if (this.mapControls.enabled) return;

    switch (code) {
      case 'KeyF':
        this.fpCamera.translateY(-1)
        break

      case 'KeyW':
        this.fpCamera.translateZ(-1)
        break

      case 'KeyR':
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

      case 'KeyQ':
        this.#focusCamera.rotateZ(0.02)
        this.dispatchEvent({
          type: 'vantage:update-focus-camera',
          value: [...this.#focusCamera.rotation].slice(0, -1)
        })
        break

      case 'KeyE':
        this.#focusCamera.rotateZ(-0.02)
        this.dispatchEvent({
          type: 'vantage:update-focus-camera',
          value: [...this.#focusCamera.rotation].slice(0, -1)
        })
        break
    }
  }

  mousedown = () => {
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

  wheel = (event) => {
    if (!this.fpControls.enabled || this.#focusCamera == null) return
    this.fpControls.attachCamera(this.#focusCamera)

    const delta = event.deltaY * 0.05
    this.#focusCamera.fov += delta
    this.#focusCamera.fov = Math.max(0, Math.min(175, this.#focusCamera.fov))
    this.#focusCamera.updateProjectionMatrix()

    this.fpControls.detachCamera()

    this.dispatchEvent({
      type: 'vantage:update-fov',
      value: this.#focusCamera.fov
    })
  }

  createFocusMarker() {
    const geom = new SphereGeometry(3, 16, 16)
    const mat = new MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 1.0 })
    this.focusMarker = new Mesh(geom, mat)
    this.focusMarker.name = 'FocusMarker'
    this.scene.add(this.focusMarker)
    this.focusMarker.visible = false
  }

  updateFocusMarker(projections) {
    const focusProjection = Object.values(projections).find((p) => p.focus && p.ready)
    if (focusProjection) {
      this.focusMarker.visible = true
      this.focusMarker.position.copy(focusProjection.camera.position)
    } else {
      this.focusMarker.visible = false
    }
  }

  focusOnCamera(projections) {
    const raycaster = new Raycaster()
    raycaster.setFromCamera(this.mouse, this.mapCamera)
    let candidate = null
    let minDistance = Infinity
    Object.values(projections).forEach((p) => {
      if (p.attributes && p.attributes['projection-type'] === 'map') return
      const targetObj = p.plane || p.helper
      const intersects = raycaster.intersectObject(targetObj, true)
      if (intersects.length > 0 && intersects[0].distance < minDistance) {
        minDistance = intersects[0].distance
        candidate = p
      }
    })
    if (candidate) {
      Object.values(projections).forEach((p) => {
        p.element.setAttribute('focus', p === candidate)
      })
      candidate.element.dispatchEvent(
        new CustomEvent('vantage:set-focus', { bubbles: true, detail: { id: candidate.id } })
      )
    }
  }

  updateMouse(event) {
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  initDragControls(projections) {
    if (this.dragControls) {
      this.dragControls.dispose()
      this.dragControls = null
    }
    this.dragControls = new DragControls([this.focusMarker], this.mapCamera, this.domElement)
    this.dragControls.addEventListener('dragstart', () => {
      if (this.mapControls) {
        this.mapControls.enabled = false
      }
    })
    this.dragControls.addEventListener('dragend', () => {
      if (this.mapControls) {
        this.mapControls.enabled = true
      }
    })
    this.dragControls.addEventListener('drag', () => {
      const focusProjection = Object.values(projections).find((p) => p.focus)
      if (!focusProjection) return
      const raycaster = new Raycaster()
      raycaster.setFromCamera(this.mouse, this.mapCamera)
      const plane = new Plane(new Vector3(0, 1, 0), -focusProjection.camera.position.y)
      const intersection = new Vector3()
      raycaster.ray.intersectPlane(plane, intersection)
      focusProjection.element.setAttribute('position', [...intersection].join(' '))
      focusProjection.element.dispatchEvent(
        new CustomEvent('vantage:set-position', {
          bubbles: true,
          detail: { position: [...intersection] }
        })
      )
    })
  }
}
