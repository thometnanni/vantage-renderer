import { Scene, WebGLRenderer, Vector2, Vector3, Group, PerspectiveCamera } from 'three'
import CameraOperator from './cameraOperator'
import { loadTexture, parseAttribute, setupScene, setupLights, getSelectedKeyframe } from './utils'
import Projection from './Projection'
import { interpolate } from 'd3-interpolate'

class VantageRenderer extends HTMLElement {
  root
  scene = new Scene()
  renderer = new WebGLRenderer()
  camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  cameraOperator
  meshes
  bounds
  projections = new Set()
  controls = false
  mousePressed = true
  lastRotation = null
  mouse = new Vector2()
  initialKeyframeRotation = null
  initialCameraRotation = null
  time = 0
  models = new Set()
  objects = new Set()
  keyframes = new Set()
  needsAttributesUpdate = false
  needsMaterialIndexUpdate = false

  constructor() {
    super()

    // const observer = new MutationObserver((mutationList, observer) => {
    //   for (const mutation of mutationList) {
    //     if (mutation.type === 'childList') {
    //       console.log('A child node has been added or removed.')
    //     } else if (mutation.type === 'attributes') {
    //       console.log(`The ${mutation.attributeName} attribute was modified.`)
    //     }
    //     console.log(mutation)
    //   }
    // })

    // // console.log(this.childNodes)

    // observer.observe(this, { attributes: true, childList: true, subtree: true })
  }

  static observedAttributes = ['time']

  async attributeChangedCallback(name, _oldValue, newValue) {
    const value = parseAttribute(name, newValue)
    switch (name) {
      case 'time': {
        this.time = value
        this.needsAttributesUpdate = true
        this.dispatchEvent(
          new CustomEvent('vantage:time-update', {
            bubbles: true,
            detail: {
              time: value
            }
          })
        )
        // Object.values(this.projections).forEach(({ element }) => {
        //   element.updateTime(value)
        // })
        break
      }
      default:
        break
    }
  }

  connectedCallback() {
    this.renderer.setPixelRatio(window.devicePixelRatio)

    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.innerHTML = `:host {display: block; height: 100%; width: 100%; overflow: hidden}`
    shadow.appendChild(style)

    this.renderer.domElement.style = 'display: block; width: 100%; height: 100%;'
    shadow.appendChild(this.renderer.domElement)

    this.camera.position.z = 5

    this.camera.layers.enable(2)

    // this.renderer.domElement.addEventListener('pointermove', (event) => {
    //   const rect = this.renderer.domElement.getBoundingClientRect()
    //   this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    //   this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    //   if (this.cameraOperator) {
    //     this.cameraOperator.updateMouse(event)
    //   }
    // })

    this.renderer.setAnimationLoop(this.update)

    this.resizeObserver = new ResizeObserver((entries) => this.resizeCanvas(entries[0].contentRect))
    this.resizeObserver.observe(this.renderer.domElement)

    // this.addEventListener('vantage:add-projection', (e) => this.addProjection(e.detail))
    // this.addEventListener('vantage:update-projection', (e) => this.updateProjection(e.detail))
    // this.addEventListener('vantage:update-projection-multi', (e) => {
    //   const { id, attributes } = e.detail

    //   Object.entries(attributes).forEach(([property, value]) =>
    //     this.updateProjection({ id, property, value })
    //   )
    // })
    // this.addEventListener('vantage:remove-projection', (e) => this.removeProjection(e.detail))

    // this.addEventListener('mousedown', () => {
    //   this.mousePressed = true
    //   const focusedProjection = Object.values(this.projections).find(({ focus }) => focus)
    //   if (focusedProjection) {
    //     const keyframe = getSelectedKeyframe(focusedProjection.element)
    //     if (keyframe) {
    //       this.initialKeyframeRotation = keyframe.getAttribute('rotation').split(' ').map(Number)
    //       this.cameraOperator.fpCamera.rotation.setFromQuaternion(
    //         this.cameraOperator.fpCamera.quaternion,
    //         'YXZ'
    //       )
    //       this.initialCameraRotation = [...this.cameraOperator.fpCamera.rotation].slice(0, 3)
    //     }
    //   }
    //   this.addEventListener(
    //     'mouseup',
    //     () => {
    //       this.mousePressed = false
    //       this.initialKeyframeRotation = null
    //       this.initialCameraRotation = null
    //     },
    //     { once: true }
    //   )
    // })

    // this.cameraOperator = new CameraOperator(this.renderer, {
    //   mapCameraPosition: [-100, 50, 50],
    //   domElement: this,
    //   scene: this.scene,
    //   firstPerson: parseAttribute('first-person', this.attributes['first-person']?.value),
    //   controls: parseAttribute('controls', this.attributes['controls']?.value)
    // })

    // this.cameraOperator.addEventListener('vantage:update-focus-camera', ({ value }) => {
    //   if (this.controls !== 'edit' || !this.cameraOperator.firstPerson) return
    //   const focusedProjection = Array.from(document.querySelectorAll('vantage-projection')).find(
    //     (p) => p.hasAttribute('focus') && p.getAttribute('focus') !== 'false'
    //   )
    //   if (!focusedProjection) return
    //   const keyframe = getSelectedKeyframe(focusedProjection)
    //   if (!keyframe) return
    //   keyframe.setAttribute('rotation', value.join(' '))
    //   keyframe.dispatchEvent(
    //     new CustomEvent('vantage:set-rotation', {
    //       bubbles: true,
    //       detail: { rotation: value }
    //     })
    //   )
    // })

    // this.cameraOperator.addEventListener('vantage:update-fov', ({ value }) => {
    //   if (this.controls !== 'edit' || !this.cameraOperator.firstPerson) return
    //   const focusedProjection = Array.from(document.querySelectorAll('vantage-projection')).find(
    //     (p) => p.hasAttribute('focus') && p.getAttribute('focus') !== 'false'
    //   )
    //   if (!focusedProjection) return
    //   const keyframe = getSelectedKeyframe(focusedProjection)
    //   if (!keyframe) return
    //   keyframe.setAttribute('fov', value)
    //   keyframe.dispatchEvent(
    //     new CustomEvent('vantage:set-fov', {
    //       bubbles: true,
    //       detail: { fov: value }
    //     })
    //   )
    // })

    // this.cameraOperator.addEventListener('vantage:unlock-first-person', () => {
    //   this.setAttribute('first-person', 'false')
    //   this.dispatchEvent(
    //     new CustomEvent('vantage:unlock-first-person', {
    //       bubbles: true
    //     })
    //   )
    // })

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
    if (this.needsAttributesUpdate) {
      this.updateAttributes()
      this.needsAttributesUpdate = false
    }

    // const globalTime = parseFloat(this.getAttribute('time')) || 0
    // const focusProjection = Object.values(this.projections).find((p) => p.focus)

    // if (focusProjection && focusProjection.ready) {
    //   this.handleCameraUpdate(focusProjection, globalTime)
    //   this.updateFocusMarkerAndControls(focusProjection, globalTime)
    // } else {
    //   this.hideFocusMarkerAndDisposeDrag()
    // }

    for (const projection of this.projections) {
      projection.update()
    }

    for (const model of this.models) {
      model.update()
    }

    for (const object of this.objects) {
      object.modified = false
    }
    this.needsMaterialIndexUpdate = false
    this.renderScene()
  }

  updateAttributes = () => {
    const objects = new Map()
    for (const keyframe of this.keyframes) {
      const object = keyframe.parentElement
      const attribute = keyframe.attribute

      if (!objects.has(object)) objects.set(object, {})
      const attributes = objects.get(object)
      if (!attributes[attribute]) attributes[attribute] = []
      attributes[attribute].push(keyframe)
    }

    for (const [object, attributes] of objects) {
      for (const [attribute, keyframes] of Object.entries(attributes)) {
        const sorted = keyframes.sort((a, b) => a.time - b.time)
        const nextIndex = sorted.findIndex((keyframe) => keyframe.time > this.time)

        if (nextIndex === -1) {
          object.setAttribute(attribute, keyframes[keyframes.length - 1].value)
          continue
        }

        if (nextIndex === 0) {
          object.setAttribute(attribute, keyframes[0].value)
          continue
        }

        const previous = sorted[nextIndex - 1]
        const next = sorted[nextIndex]
        const progress = (this.time - previous.time) / (next.time - previous.time)

        const value = interpolate(previous.value, next.value)(progress)

        object.setAttribute(attribute, value)
      }
    }
    // console.log(time)
  }

  indexProjections = () => {
    const projectionNodes = [...this.children].filter(
      (c) => c.constructor.name === 'VantageProjection'
    )
    this.projections.forEach((p) => {
      p.index = projectionNodes.indexOf(p)
    })

    this.needsMaterialIndexUpdate = true
  }

  // handleCameraUpdate(focusProjection, globalTime) {
  //   // const activeKeyframe = getSelectedKeyframe(focusProjection.element)
  //   // const keyframeTime = activeKeyframe ? parseFloat(activeKeyframe.getAttribute('time')) : 0

  //   if (this.cameraOperator.firstPerson) {
  //     // if (globalTime === keyframeTime) {
  //     this.cameraOperator.fpControls.enabled = true
  //     if (!this.cameraOperator.dragControls) {
  //       this.cameraOperator.initDragControls(this.projections)
  //     }
  //     this.updateFocusCamera()
  //     this.updateFocusRotation()
  //     this.syncCamera(this.cameraOperator.fpCamera)
  //     // } else {
  //     //   this.cameraOperator.fpControls.enabled = false
  //     //   if (this.cameraOperator.dragControls) {
  //     //     this.disposeDragControls()
  //     //   }
  //     //   const keyframeData = focusProjection.getInterpolatedKeyframe(globalTime)
  //     //   if (keyframeData) {
  //     //     focusProjection.updateCameraFromKeyframe(keyframeData)
  //     //   }
  //     //   this.syncCamera(focusProjection.camera)
  //     // }
  //   } else {
  //     const keyframeData = focusProjection.getInterpolatedKeyframe(globalTime)
  //     if (keyframeData) {
  //       focusProjection.updateCameraFromKeyframe(keyframeData)
  //     }
  //   }
  // }

  // updateFocusMarkerAndControls(focusProjection, globalTime) {
  //   this.cameraOperator.focusMarker.visible = true
  //   this.cameraOperator.focusMarker.position.copy(focusProjection.camera.position)

  //   if (this.cameraOperator.firstPerson) {
  //     const activeKeyframe = getSelectedKeyframe(focusProjection.element)
  //     const keyframeTime = activeKeyframe ? parseFloat(activeKeyframe.getAttribute('time')) : 0
  //     if (globalTime === keyframeTime && !this.cameraOperator.dragControls) {
  //       this.cameraOperator.initDragControls(this.projections)
  //     } else if (globalTime !== keyframeTime && this.cameraOperator.dragControls) {
  //       this.disposeDragControls()
  //     }
  //   } else if (!this.cameraOperator.dragControls) {
  //     this.cameraOperator.initDragControls(this.projections)
  //   }
  // }

  // hideFocusMarkerAndDisposeDrag() {
  //   if (this.cameraOperator.focusMarker) {
  //     this.cameraOperator.focusMarker.visible = false
  //   }
  //   if (this.cameraOperator.dragControls) {
  //     this.disposeDragControls()
  //   }
  // }

  // syncCamera(sourceCamera) {
  //   const targetCamera = this.cameraOperator.camera
  //   targetCamera.position.copy(sourceCamera.position)
  //   targetCamera.quaternion.copy(sourceCamera.quaternion)
  //   if (sourceCamera.fov) {
  //     targetCamera.fov = sourceCamera.fov
  //     targetCamera.updateProjectionMatrix()
  //   }
  // }

  // disposeDragControls() {
  //   this.cameraOperator.dragControls.dispose()
  //   this.cameraOperator.dragControls = null
  // }

  renderScene() {
    // this.renderer.render(this.scene, this.cameraOperator.camera)
    // this.renderer.clearDepth()
    // this.cameraOperator.camera.layers.enable(2)
    this.renderer.render(this.scene, this.camera)
  }

  // updateFocusCamera = () => {
  //   if (this.controls !== 'edit' || !this.cameraOperator.firstPerson) return
  //   const projection = Object.values(this.projections).find(({ focus }) => focus)
  //   if (!projection) return
  //   const pos = this.cameraOperator.camera.getWorldPosition(new Vector3())
  //   const keyframe = getSelectedKeyframe(projection.element)
  //   if (!keyframe) return
  //   keyframe.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`)
  //   keyframe.dispatchEvent(
  //     new CustomEvent('vantage:set-position', {
  //       bubbles: true,
  //       detail: { position: [...pos] }
  //     })
  //   )
  // }

  // updateFocusRotation = () => {
  //   if (
  //     this.controls !== 'edit' ||
  //     !this.cameraOperator.firstPerson ||
  //     !this.mousePressed ||
  //     !this.initialKeyframeRotation ||
  //     !this.initialCameraRotation
  //   ) {
  //     return
  //   }

  //   // probably there's a betterr way to do this
  //   this.cameraOperator.fpCamera.rotation.setFromQuaternion(
  //     this.cameraOperator.fpCamera.quaternion,
  //     'YXZ'
  //   )
  //   const currentCameraRotation = [...this.cameraOperator.fpCamera.rotation].slice(0, 3)
  //   const deltaRotation = currentCameraRotation.map((val, i) => val - this.initialCameraRotation[i])
  //   const newRotation = this.initialKeyframeRotation.map((val, i) => val + deltaRotation[i])
  //   const projection = Object.values(this.projections).find(({ focus }) => focus)
  //   if (!projection) return
  //   const keyframe = getSelectedKeyframe(projection.element)
  //   if (!keyframe) return

  //   keyframe.setAttribute('rotation', newRotation.join(' '))
  //   keyframe.dispatchEvent(
  //     new CustomEvent('vantage:set-rotation', {
  //       bubbles: true,
  //       detail: { rotation: newRotation }
  //     })
  //   )
  // }

  // async addProjection({ id, attributes, element }) {
  //   const texture = await loadTexture(attributes.src)

  //   const width = texture.source.data.videoWidth ?? texture.source.data.width
  //   const height = texture.source.data.videoHeight ?? texture.source.data.height

  //   const index = Array.prototype.indexOf.call(this.children, element)
  //   Object.values(this.projections).forEach((projection) => {
  //     if (projection.index >= index) projection.index
  //   })

  //   const projection = new Projection({
  //     id,
  //     index,
  //     attributes,
  //     renderer: this.renderer,
  //     scene: this.scene,
  //     layers: attributes.layers,
  //     texture,
  //     position: attributes.position,
  //     rotation: attributes.rotation,
  //     bounds: attributes.bounds ?? this.bounds,
  //     fov: attributes.fov,
  //     ratio: width / height,
  //     far: attributes.far,
  //     projectionType: attributes['projection-type'],
  //     screen: attributes.screen,
  //     focus: attributes.focus,
  //     opacity: attributes.opacity,
  //     passThrough: attributes['pass-through'],
  //     element
  //   })

  //   projection.update()
  //   this.scene.add(projection.helper)

  //   if (attributes.focus) {
  //     this.cameraOperator.camera = projection.camera
  //   }

  //   this.projections[id] = projection
  //   element.updateTime(parseAttribute('time', this.getAttribute('time') ?? 0))
  // }

  // async updateProjection({ id, property, value }) {
  //   const projection = this.projections[id]
  //   if (projection == null) return
  //   switch (property) {
  //     case 'src': {
  //       const texture = await loadTexture(value)
  //       projection.texture = texture
  //       break
  //     }
  //     case 'bounds':
  //       projection.bounds = value
  //         ? { bounds: value, auto: false }
  //         : { bounds: this.bounds, auto: true }
  //       break
  //     case 'focus':
  //       this.cameraOperator.camera = projection.camera
  //       projection[property] = value
  //       break
  //     default:
  //       projection[property] = value
  //   }
  // }

  // removeProjection({ id }) {
  //   const index = this.projections[id].index

  //   this.projections[id].destroy()
  //   delete this.projections[id]

  //   Object.values(this.projections).forEach((projection) => {
  //     if (projection.index > index) projection.index--
  //   })
  // }

  // getFocusProjectionInterpolation(time) {
  //   time = time ?? parseFloat(this.getAttribute('time'))
  //   const focusProjection = Object.values(this.projections).find((p) => p.focus)

  //   if (focusProjection) {
  //     const keyframe = focusProjection.getInterpolatedKeyframe(time)
  //     focusProjection.element.dispatchEvent(
  //       new CustomEvent('vantage:create-keyframe', {
  //         bubbles: true,
  //         detail: {
  //           far: +keyframe.far,
  //           fov: +keyframe.fov,
  //           position: keyframe.position.split(' ').map((v) => +v),
  //           rotation: keyframe.rotation.split(' ').map((v) => +v),
  //           time
  //         }
  //       })
  //     )
  //   }
  // }

  registerProjection(projection) {
    this.projections.add(projection)

    this.indexProjections()
  }
  unregisterProjection(projection) {
    this.projections.delete(projection)

    this.indexProjections()
  }

  registerObject(object) {
    this.objects.add(object)
  }
  unregisterObject(object) {
    this.objects.delete(object)
  }

  registerModel(model) {
    this.models.add(model)
  }
  unregisterModel(model) {
    this.models.delete(model)
  }

  registerKeyframe(keyframe) {
    this.keyframes.add(keyframe)
    this.needsAttributesUpdate = true
  }
  unregisterKeyframe(keyframe) {
    this.keyframes.delete(keyframe)
    this.needsAttributesUpdate = true
  }
}

export { VantageRenderer }
