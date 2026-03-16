import * as THREE from 'three'
import { patchShader, addLoadListener, computeScaledDimensions } from './shader-utils'
import {
  vertexShaderHeader,
  vertexShaderMain,
  fragmentShaderHeader,
  fragmentShaderReplace
} from './shader-chunks'

export default class ProjectionMaterial extends THREE.MeshPhysicalMaterial {
  #camera

  get camera() {
    return this.#camera
  }
  set camera(camera) {
    if (!camera?.isCamera) {
      throw new Error('Invalid camera set to the ProjectionMaterial')
    }
    this.#camera = camera
    this.#saveDimensions()
  }

  get texture() {
    return this.uniforms.projectedTexture.value
  }
  set texture(texture) {
    if (!texture?.isTexture) {
      throw new Error('Invalid texture set to the ProjectionMaterial')
    }

    this.uniforms.projectedTexture.value = texture
    this.uniforms.isTextureLoaded.value = Boolean(texture.image)

    if (!this.uniforms.isTextureLoaded.value) {
      addLoadListener(texture, () => {
        this.uniforms.isTextureLoaded.value = true
        this.dispatchEvent({ type: 'textureload' })
        this.#saveDimensions()
      })
    } else {
      this.#saveDimensions()
    }
  }

  get depthMap() {
    return this.uniforms.depthMap.value
  }
  set depthMap(depthMap) {
    if (depthMap !== null && !depthMap?.isTexture) {
      throw new Error('Invalid texture set to the ProjectionMaterial')
    }
    this.uniforms.depthMap.value = depthMap
  }

  constructor({ camera = new THREE.PerspectiveCamera(), texture = new THREE.Texture(), depthMap = null, ...options } = {}) {
    if (!texture.isTexture) {
      throw new Error('Invalid texture passed to the ProjectionMaterial')
    }
    if (!camera.isCamera) {
      throw new Error('Invalid camera passed to the ProjectionMaterial')
    }

    super(options)

    Object.defineProperty(this, 'isProjectionMaterial', { value: true })

    this.#camera = camera

    this.uniforms = {
      projectedTexture: { value: null },
      isTextureLoaded: { value: false },
      isTextureProjected: { value: false },
      viewMatrixCamera: { value: new THREE.Matrix4() },
      projectionMatrixCamera: { value: new THREE.Matrix4() },
      projPosition: { value: new THREE.Vector3() },
      projDirection: { value: new THREE.Vector3(0, 0, -1) },
      savedModelMatrix: { value: new THREE.Matrix4() },
      widthScaled: { value: 1 },
      heightScaled: { value: 1 },
      depthMap: { value: depthMap }
    }

    this.onBeforeCompile = (shader) => {
      Object.assign(this.uniforms, shader.uniforms)
      shader.uniforms = this.uniforms

      if (depthMap) {
        shader.defines.STOP_PROPAGATION = ''
      }

      shader.vertexShader = patchShader(shader.vertexShader, {
        header: vertexShaderHeader,
        main: vertexShaderMain
      })

      shader.fragmentShader = patchShader(shader.fragmentShader, {
        header: fragmentShaderHeader,
        'vec4 diffuseColor = vec4( diffuse, opacity );': fragmentShaderReplace
      })
    }

    window.addEventListener('resize', this.#saveCameraProjectionMatrix)

    // use the setter — handles load detection and saveDimensions()
    this.texture = texture
  }

  #saveCameraProjectionMatrix = () => {
    this.uniforms.projectionMatrixCamera.value.copy(this.camera.projectionMatrix)
    this.#saveDimensions()
  }

  #saveDimensions() {
    const [widthScaled, heightScaled] = computeScaledDimensions(this.texture, this.camera)
    this.uniforms.widthScaled.value = widthScaled
    this.uniforms.heightScaled.value = heightScaled
  }

  #saveCameraMatrices() {
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    this.camera.updateWorldMatrix()

    const viewMatrixCamera = this.camera.matrixWorldInverse
    const projectionMatrixCamera = this.camera.projectionMatrix
    const modelMatrixCamera = this.camera.matrixWorld

    this.uniforms.viewMatrixCamera.value.copy(viewMatrixCamera)
    this.uniforms.projectionMatrixCamera.value.copy(projectionMatrixCamera)
    this.uniforms.projPosition.value.setFromMatrixPosition(modelMatrixCamera)
    this.uniforms.projDirection.value.set(0, 0, 1).transformDirection(modelMatrixCamera)

    this.uniforms.isTextureProjected.value = true
  }

  #validateMeshMaterial(mesh) {
    if (
      !(Array.isArray(mesh.material)
        ? mesh.material.some((m) => m.isProjectionMaterial)
        : mesh.material.isProjectionMaterial)
    ) {
      throw new Error(`The mesh material must be a ProjectionMaterial`)
    }

    if (
      !(Array.isArray(mesh.material)
        ? mesh.material.some((m) => m === this)
        : mesh.material === this)
    ) {
      throw new Error(
        `The provided mesh doesn't include this material where project() has been called from`
      )
    }
  }

  project(mesh) {
    this.#validateMeshMaterial(mesh)

    mesh.updateWorldMatrix(true, false)
    this.uniforms.savedModelMatrix.value.copy(mesh.matrixWorld)

    this.#saveCameraMatrices()
  }

  copy(source) {
    super.copy(source)
    this.camera = source.camera
    this.texture = source.texture
    this.depthMap = source.depthMap
    return this
  }

  dispose() {
    super.dispose()
    window.removeEventListener('resize', this.#saveCameraProjectionMatrix)
  }
}
