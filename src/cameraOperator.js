import { PerspectiveCamera, Vector3, Euler, EventDispatcher } from 'three'
import { MapControls } from 'three/addons/controls/MapControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

// Reused vectors to avoid per-frame allocations
const _forward = new Vector3()
const _right = new Vector3()
const _worldUp = new Vector3(0, 1, 0)
const _euler = new Euler(0, 0, 0, 'YXZ')

export class CameraOperator extends EventDispatcher {
  mapCamera = new PerspectiveCamera(60, 1, 0.1, 10000)
  // fpCamera is used for aim mode — screen aspect ratio, synced to active projection
  fpCamera = new PerspectiveCamera(60, 1, 0.1, 10000)
  mapControls
  transformControls

  activeProjection = null
  mode = 'map' // 'map' | 'move' | 'aim'
  editingEnabled = false

  _transition = null
  _heldKeys = new Set()
  _isDragging = false
  _dragLast = { x: 0, y: 0 }
  _domElement

  constructor(renderer, scene, { mapCameraPosition = [-100, 50, 50] } = {}) {
    super()
    this._domElement = renderer.domElement

    this.mapCamera.position.set(...mapCameraPosition)

    this.mapControls = new MapControls(this.mapCamera, renderer.domElement)
    this.mapControls.enableDamping = true

    // In r162+, scene.add(transformControls) is replaced by scene.add(transformControls.getHelper())
    this.transformControls = new TransformControls(this.mapCamera, renderer.domElement)
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.mapControls.enabled = !event.value
    })
    scene.add(this.transformControls.getHelper())

    // Aim mode: drag to look (no pointer lock)
    renderer.domElement.addEventListener('mousedown', this._onMouseDown)
    renderer.domElement.addEventListener('mousemove', this._onMouseMove)
    renderer.domElement.addEventListener('mouseup', this._onMouseUp)
    renderer.domElement.addEventListener('mouseleave', this._onMouseUp)

    document.addEventListener('keydown', this._onKeydown)
    document.addEventListener('keyup', this._onKeyup)
  }

  // The camera used for the main scene render
  get camera() {
    return this.mode === 'aim' ? this.fpCamera : this.mapCamera
  }

  // Select a projection — shows gizmo (if editing), stays in map view (no transition)
  selectProjection(projection) {
    if (this.mode === 'aim') this._exitAimMode()
    this.transformControls.detach()
    this.activeProjection = projection
    const newMode = this.editingEnabled ? 'move' : 'map'
    if (this.editingEnabled) this.transformControls.attach(projection)
    this.mode = newMode
    this.dispatchEvent({ type: 'select', projection })
    this.dispatchEvent({ type: 'mode-changed', mode: newMode })
  }

  deselectProjection() {
    if (this.mode === 'aim') this._exitAimMode()
    this.transformControls.detach()
    this._transition = null
    this.activeProjection = null
    this.mode = 'map'
    this.dispatchEvent({ type: 'deselect' })
    this.dispatchEvent({ type: 'mode-changed', mode: 'map' })
  }

  // mode: 'aim' | 'move'  (pass 'map' / nothing to deselect)
  setMode(newMode) {
    if (newMode === this.mode || !this.activeProjection) return

    if (newMode === 'aim') {
      this.transformControls.detach()
      // Position fpCamera at projection with screen aspect ratio
      this.fpCamera.position.copy(this.activeProjection.position)
      this.fpCamera.quaternion.copy(this.activeProjection.quaternion)
      this.fpCamera.aspect = this._domElement.clientWidth / this._domElement.clientHeight
      this.fpCamera.updateProjectionMatrix()
      // Transition mapCamera to projection position, then switch rendering to fpCamera
      this._startTransition(
        this.mapCamera.position.clone(),
        this.mapCamera.quaternion.clone(),
        this.activeProjection.position.clone(),
        this.activeProjection.quaternion.clone(),
        600,
        () => {
          if (!this.activeProjection) return
          this.mode = 'aim'
          this.dispatchEvent({ type: 'mode-changed', mode: 'aim' })
        }
      )
      // mode stays unchanged until transition completes
    } else if (newMode === 'move') {
      if (!this.editingEnabled) return
      if (this.mode === 'aim') this._exitAimMode()
      this.transformControls.attach(this.activeProjection)
      this.mode = 'move'
      this.dispatchEvent({ type: 'mode-changed', mode: 'move' })
    } else {
      this.deselectProjection()
    }
  }

  setEditingEnabled(enabled) {
    if (!enabled) {
      if (this.mode === 'move') {
        this.transformControls.detach()
        this.mode = 'map'
        this.dispatchEvent({ type: 'mode-changed', mode: 'map' })
      }
    } else if (this.activeProjection && this.mode !== 'aim') {
      this.transformControls.attach(this.activeProjection)
      this.mode = 'move'
      this.dispatchEvent({ type: 'mode-changed', mode: 'move' })
    }
    this.editingEnabled = enabled
    this.dispatchEvent({ type: 'editing-changed', enabled })
  }

  // Call every frame — deltaMs is time since last frame in milliseconds
  update(deltaMs) {
    if (this._transition) {
      this._transition.elapsed += deltaMs
      const t = Math.min(this._transition.elapsed / this._transition.duration, 1)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      this.mapCamera.position.lerpVectors(this._transition.startPos, this._transition.endPos, eased)
      this.mapCamera.quaternion.slerpQuaternions(this._transition.startQuat, this._transition.endQuat, eased)
      if (t >= 1) {
        this._transition.onComplete?.()
        this._transition = null
      }
    } else if (this.mode === 'aim') {
      this._updateAimMovement(deltaMs)
    } else {
      this.mapControls.update()
    }
  }

  dispose() {
    this._domElement.removeEventListener('mousedown', this._onMouseDown)
    this._domElement.removeEventListener('mousemove', this._onMouseMove)
    this._domElement.removeEventListener('mouseup', this._onMouseUp)
    this._domElement.removeEventListener('mouseleave', this._onMouseUp)
    document.removeEventListener('keydown', this._onKeydown)
    document.removeEventListener('keyup', this._onKeyup)
    this.mapControls.dispose()
    this.transformControls.dispose()
  }

  _startTransition(startPos, startQuat, endPos, endQuat, duration, onComplete) {
    this._transition = { startPos, startQuat, endPos, endQuat, elapsed: 0, duration, onComplete }
  }

  // Sync mapCamera to fpCamera position, update MapControls target, exit aim mode
  _exitAimMode() {
    if (this.mode !== 'aim') return
    this.mapCamera.position.copy(this.fpCamera.position)
    this.mapCamera.quaternion.copy(this.fpCamera.quaternion)
    // Point MapControls target in front of the camera to prevent rotation snap on next update
    this.fpCamera.getWorldDirection(_forward)
    this.mapControls.target.copy(this.fpCamera.position).addScaledVector(_forward, 10)
    this.mapControls.enableDamping = false
    this.mapControls.update()
    this.mapControls.enableDamping = true
    this.mode = 'map'
    this._isDragging = false
    this._heldKeys.clear()
  }

  _updateAimMovement(deltaMs) {
    if (this._heldKeys.size === 0) return

    this.fpCamera.getWorldDirection(_forward)
    _forward.y = 0
    const len = _forward.length()
    if (len < 0.001) return // Looking straight up/down
    _forward.divideScalar(len)
    _right.crossVectors(_forward, _worldUp).normalize()

    const speed = 0.03 * deltaMs
    const pos = this.fpCamera.position
    let moved = false

    if (this._heldKeys.has('KeyW') || this._heldKeys.has('ArrowUp')) { pos.addScaledVector(_forward, speed); moved = true }
    if (this._heldKeys.has('KeyS') || this._heldKeys.has('ArrowDown')) { pos.addScaledVector(_forward, -speed); moved = true }
    if (this._heldKeys.has('KeyA') || this._heldKeys.has('ArrowLeft')) { pos.addScaledVector(_right, -speed); moved = true }
    if (this._heldKeys.has('KeyD') || this._heldKeys.has('ArrowRight')) { pos.addScaledVector(_right, speed); moved = true }
    if (this._heldKeys.has('KeyR')) { pos.y += speed; moved = true }
    if (this._heldKeys.has('KeyF')) { pos.y -= speed; moved = true }

    if (moved) {
      this.activeProjection.position.copy(pos)
      this.activeProjection.updateMatrixWorld()
    }
  }

  _onMouseDown = (event) => {
    if (this.mode !== 'aim') return
    this._isDragging = true
    this._dragLast = { x: event.clientX, y: event.clientY }
  }

  _onMouseMove = (event) => {
    if (this.mode !== 'aim' || !this._isDragging) return
    const dx = event.clientX - this._dragLast.x
    const dy = event.clientY - this._dragLast.y
    this._dragLast = { x: event.clientX, y: event.clientY }

    _euler.setFromQuaternion(this.fpCamera.quaternion)
    _euler.y -= dx * 0.003
    _euler.x -= dy * 0.003
    _euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, _euler.x))
    this.fpCamera.quaternion.setFromEuler(_euler)

    this.activeProjection.quaternion.copy(this.fpCamera.quaternion)
    this.activeProjection.updateMatrixWorld()
  }

  _onMouseUp = () => {
    this._isDragging = false
  }

  _onKeydown = (event) => {
    if (this.mode === 'aim') this._heldKeys.add(event.code)

    switch (event.code) {
      case 'Tab':
        event.preventDefault()
        if (!this.activeProjection) return
        if (this.mode === 'aim' && this.editingEnabled) this.setMode('move')
        else if (this.mode === 'move') this.setMode('aim')
        else if (this.mode === 'map') this.setMode('aim')
        break
      case 'Escape':
        if (this.activeProjection) this.deselectProjection()
        break
    }
  }

  _onKeyup = (event) => {
    this._heldKeys.delete(event.code)
  }
}
