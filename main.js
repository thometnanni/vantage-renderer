import * as THREE from 'three'

import center from '@turf/center'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min'
import { generateBuildings, toMeters } from './city'

import CameraOperator from './cameraOperator'
import Projection from './Projection'

import records from './records'

// const geojsonUrl = "./nk-arcaden.json";
const geojsonUrl = './hermannstrasse.json'
const imageUrl = './media/warthe-helper.png'

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

  cameraOperator = new CameraOperator(
    renderer,
    [-118.89, 28.07, 14.24],
    [-1.8891596839718918, -1.266917979002451, -1.9033664838293778, 'XYZ']
  )

  const map = await fetch(geojsonUrl).then(d => d.json())
  const mapCenter = center(map)

  const buildingGeometry = generateBuildings(
    map,
    mapCenter,
    [13.4197998046875, 52.46605036188952, 13.43902587890625, 52.47608904123904]
  )

  const wireframeMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000
  })

  const solidMaterial = new THREE.MeshPhongMaterial({
    color: 0xeeeeee
  })

  // const geo = new THREE.EdgesGeometry(buildingGeometry)
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xaaaaaa
  })

  // const wireframe = new THREE.LineSegments(geo, lineMaterial)
  // const solidMesh = new THREE.Mesh(buildingGeometry, solidMaterial)

  meshes = unpackMeshes(await loadScene('public/media/scene.gltf'))

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
          // layers: { buildings, ground },
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
          orthographic,
          size,
          center: mapCenter
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

  // HELPER
  // const dot = new THREE.Mesh(
  //   new THREE.SphereGeometry(4),
  //   new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  // );
  // const coordinate = [13.422461, 52.472694];
  // const local = toMeters(mapCenter, mapCenter);
  // dot.position.set(local.x, 0, local.y);
  // scene.add(dot);

  window.addEventListener('resize', onWindowResize)

  const keys = {
    fpv: 'first person [⏎]',
    projection: `projection [0-${Math.min(projections.length - 1, 9)}]`,
    fov: 'fov'
  }
  const options = {
    fpv: false,
    [keys.projection]: null
    // [keys.fov]: 50,
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

            // cameraOperator.projection.material.ground.visible = false;
            // console.log(
            //   (cameraOperator.projection.material.ground =
            //     new THREE.MeshBasicMaterial({ color: 0xff0000 })),
            // );
            // cameraOperator.projection.layers.ground.material
          })
      }
      // const textureOptions
      // gui.add(cameraOperator.projection.camera, "fov", 5, 170).onChange(() => {
      //   cameraOperator.projection.update();
      // });

      meshes.forEach(m =>
        gui.add(cameraOperator.projection.renderToLayer, m.name)
      )
      // gui.add(cameraOperator.projection.renderToLayer, 'buildings')
      // gui.add(cameraOperator.projection.renderToLayer, 'ground')
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
          // cameraOperator.projection.camera.rotation.x = v / (180 / Math.PI);
          // cameraOperator.projection.camera.setRotationFromEuler(
          //   new THREE.Euler(...rotation, "ZYX"),
          // );
          cameraOperator.projection.update()
        })

      gui
        .add(rotation, 'y', -180, 180)
        .name('yaw')
        .onChange(v => {
          cameraOperator.projection.camera.rotation.y = v / (180 / Math.PI)
          // cameraOperator.projection.camera.setRotationFromEuler(
          //   new THREE.Euler(...rotation, "XYZ"),
          // );
          cameraOperator.projection.update()
        })

      gui
        .add(rotation, 'z', -180, 180)
        .name('roll')
        .onChange(v => {
          cameraOperator.projection.camera.rotation.z = v / (180 / Math.PI)
          // cameraOperator.projection.camera.setRotationFromEuler(
          //   new THREE.Euler(...rotation, "XYZ"),
          // );
          cameraOperator.projection.update()
        })

      gui
        .add(cameraOperator.projection.camera, 'far', 1, 1000)
        .name('distance')
        .onChange(v => {
          // cameraOperator.projection.camera.rotation.z = v / (180 / Math.PI);
          // cameraOperator.projection.camera.setRotationFromEuler(
          //   new THREE.Euler(...rotation, "XYZ"),
          // );
          cameraOperator.projection.update()
        })
    }
  })
  // gui.add(options, keys.fov, 1, 170).onChange((value) => {
  //   if (cameraOperator.projection == null) return;
  //   cameraOperator.projection.camera.fov = value;
  //   cameraOperator.projection.update();
  // });

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
    // if (code === "Space") {
    //   // cameraOperator.fp();
    //   if (cameraOperator.projection) {
    //     cameraOperator.detachProjection();
    //   } else {
    //     cameraOperator.attachProjection(cameraOperator.projection, shiftKey);
    //   }
    // }
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

async function loadTexture (url) {
  const isVideo = /\.(mp4|webm|ogg)$/i.test(url)
  if (isVideo) {
    const media = await new Promise(resolve => {
      const el = document.createElement('video')
      el.src = url
      el.crossOrigin = true
      el.playsInline = true
      el.muted = true
      el.loop = true
      el.play()
      el.addEventListener('playing', () => resolve(el), { once: true })
    })

    return new THREE.VideoTexture(media)
  } else {
    const loader = new THREE.TextureLoader()
    return await new Promise(resolve =>
      loader.load(
        url,
        texture => resolve(texture),
        undefined,
        err => console.error(err)
      )
    )
  }
}

async function loadScene (url) {
  const loader = new GLTFLoader()

  const gltf = await new Promise(resolve =>
    loader.load(
      url,
      gltf => resolve(gltf),
      undefined,
      err => console.error(err)
    )
  )

  return gltf.scene
}

function unpackMeshes (object) {
  if (object.isGroup) {
    return object.children
      .map(o => unpackMeshes(o))
      .flat()
      .filter(o => o != null)
  }
  if (object.isMesh) {
    return [object]
  }
}
