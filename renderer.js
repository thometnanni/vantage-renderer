import * as THREE from 'three'

import { GUI } from 'three/addons/libs/lil-gui.module.min'

import CameraOperator from './cameraOperator'
import Projection from './Projection'

import { loadTexture, loadScene, unpackMeshes } from './src/utils'

import records from './records'

let scene,
  renderer,
  meshes,
  cameraOperator,
  projections = []

init()

async function init () {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xcccccc)
  // scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  renderer = new THREE.WebGLRenderer({ antialias: false })

  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setAnimationLoop(update)
  document.body.appendChild(renderer.domElement)

  cameraOperator = new CameraOperator(renderer)

  const solidMaterial = new THREE.MeshPhongMaterial({
    color: 0xeeeeee
  })

  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xaaaaaa
  })

  meshes = unpackMeshes(await loadScene('media/scene.gltf'))

  meshes.forEach(mesh => {
    // reset materials
    mesh.geometry.clearGroups()
    mesh.geometry.addGroup(0, Infinity, 0)
    mesh.material = [solidMaterial]

    // create wireframe
    scene.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        lineMaterial
      )
    )
  })

  scene.add(...meshes)

  console.log(scene)

  const bbox = new THREE.Box3().setFromObject(scene)

  const sceneBounds = [bbox.max.z, bbox.min.z, bbox.min.x, bbox.max.x]

  const promises = records.map(async record => {
    const url = Array.isArray(record.media) ? record.media[0] : record.media

    const texture = await loadTexture(url)

    return { texture, record }
  })

  await Promise.all(promises).then(d => {
    projections.push(
      ...d.map(({ record, texture }) => {
        const {
          position,
          rotation,
          fov,
          ratio,
          far,
          orthographic,
          size,
          bounds
        } = record.camera

        return new Projection({
          renderer,
          scene,
          layers: Object.fromEntries(meshes.map(m => [m.name, m])),
          texture,
          textureSource: Array.isArray(record.media)
            ? record.media[0]
            : record.media,
          cameraPosition: position,
          cameraRotation: rotation,
          bounds: bounds ?? sceneBounds,
          fov,
          ratio,
          far,
          orthographic
        })
      })
    )
  })

  projections.forEach(projection => {
    projection.update()
    scene.add(projection.helper)
  })

  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3)
  dirLight1.position.set(1, 1, 1)
  scene.add(dirLight1)

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 3)
  dirLight2.position.set(-1, -1, -1)
  scene.add(dirLight2)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(ambientLight)

  window.addEventListener('resize', onWindowResize)

  const keys = {
    fpv: 'first person [⏎]',
    projection: `projection [0-${Math.min(projections.length - 1, 9)}]`,
    fov: 'fov'
  }
  const options = {
    fpv: false,
    [keys.projection]: null
  }

  const camOptions = {
    none: null,
    map: 0
  }

  for (let i = 1; i < projections.length; i++) {
    camOptions[`cam ${i}`] = i
  }

  const gui = new GUI()
  const guiControllerFPV = gui
    .add(options, 'fpv')
    .name('first person [⏎]')
    .onChange(() => {
      cameraOperator.toggle()
      document.activeElement.blur()
    })
  gui.add(options, keys.projection, camOptions).onChange(value => {
    const removeControllers = [
      'texture',
      'fov',
      'x',
      'y',
      'z',
      'yaw',
      'pitch',
      'roll',
      'far',
      'textureSource',
      ...meshes.map(m => m.name),
      'plane'
    ]
    gui.controllers
      .filter(({ property }) => removeControllers.includes(property))
      .forEach(c => c.destroy())
    if (value == null) {
      cameraOperator.detachProjection()
    } else {
      cameraOperator.attachProjection(projections[value])

      if (Array.isArray(records[value].media)) {
        gui
          .add(cameraOperator.projection, 'textureSource', records[value].media)
          .name('texture')
          .onChange(async url => {
            const texture = await loadTexture(url)
            cameraOperator.projection.updateTexture(texture)
          })
      }

      meshes.forEach(m =>
        gui.add(cameraOperator.projection.renderToLayer, m.name)
      )

      gui.add(cameraOperator.projection.renderToLayer, 'plane')

      if (!cameraOperator.projection.camera.isOrthographicCamera) {
        gui
          .add(cameraOperator.projection.camera, 'fov', 5, 170)
          .onChange(() => {
            cameraOperator.projection.update()
          })

        gui
          .add(cameraOperator.projection.camera.position, 'x', -500, 500)
          .onChange(() => {
            cameraOperator.projection.update()
          })
        gui
          .add(cameraOperator.projection.camera.position, 'z', -500, 500)
          .name('y')
          .onChange(() => {
            cameraOperator.projection.update()
          })
        gui
          .add(cameraOperator.projection.camera.position, 'y')
          .name('height')
          .onChange(() => {
            3
            cameraOperator.projection.update()
          })
      }
      const rotation = new THREE.Vector3(
        ...[...cameraOperator.projection.camera.rotation].map(
          v => (v * (180 / Math.PI)) % 180
        )
      )

      gui
        .add(rotation, 'x', -90, 90)
        .name('pitch')
        .onChange(v => {
          const current = cameraOperator.projection.camera.rotation.x
          const diff = v / (180 / Math.PI) - current
          cameraOperator.projection.camera.rotateX(diff)
          cameraOperator.projection.update()
        })

      gui
        .add(rotation, 'y', -180, 180)
        .name('yaw')
        .onChange(v => {
          cameraOperator.projection.camera.rotation.y = v / (180 / Math.PI)
          cameraOperator.projection.update()
        })

      gui
        .add(rotation, 'z', -180, 180)
        .name('roll')
        .onChange(v => {
          cameraOperator.projection.camera.rotation.z = v / (180 / Math.PI)
          cameraOperator.projection.update()
        })

      gui
        .add(cameraOperator.projection.camera, 'far', 1, 1000)
        .name('distance')
        .onChange(v => {
          cameraOperator.projection.update()
        })
    }
  })

  window.addEventListener('keydown', async ({ code, shiftKey }) => {
    const digit = /^Digit([0-9])/.exec(code)?.[1]
    if (digit != null) {
      const index = +digit
      const guiController = gui.controllers.find(
        ({ property }) => property === keys.projection
      )
      if (
        index >= projections.length ||
        projections[index] === cameraOperator.projection
      ) {
        // cameraOperator.detachProjection();
        guiController.setValue(null)
      } else {
        // cameraOperator.attachProjection(projections[activeProjection]);
        guiController.setValue(index)
      }
      guiController.updateDisplay()
    }

    if (code === 'Enter' || code === 'Space') {
      options.fpv = !options.fpv
      guiControllerFPV.updateDisplay()
      cameraOperator.toggle()
    }

    if (code === 'KeyX') {
      console.log(cameraOperator.camera.position)
      console.log(cameraOperator.camera.rotation)
    }

    if (code === 'KeyC') {
      const currentRecords = records.map((r, i) => {
        const width = projections[i].camera.right - projections[i].camera.left
        const height = projections[i].camera.top - projections[i].camera.bottom
        return {
          ...r,
          camera: {
            position: [...projections[i].camera.position],
            rotation: [...projections[i].camera.rotation],
            fov: projections[i].camera.fov,
            ratio: projections[i].camera.aspect ?? height / width,
            far: projections[i].camera.far,
            size: width ?? undefined,
            orthographic: projections[i].camera.isOrthographicCamera
          }
        }
      })

      await navigator.clipboard.writeText(
        JSON.stringify(currentRecords, null, 2)
      )
      console.log('copied to clipboard')
    }
  })
}

function onWindowResize () {
  cameraOperator.camera.aspect = window.innerWidth / window.innerHeight
  cameraOperator.camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

function update () {
  renderer.render(scene, cameraOperator.camera)
}
