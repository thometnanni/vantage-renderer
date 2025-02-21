import {
  VideoTexture,
  TextureLoader,
  Box3,
  Group,
  MeshPhongMaterial,
  LineBasicMaterial,
  LineSegments,
  EdgesGeometry,
  AmbientLight,
  DirectionalLight
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

async function loadTexture(url) {
  const isVideo = /\.(mp4|webm|ogg)$/i.test(url)
  if (isVideo) {
    const media = await new Promise((resolve) => {
      const el = document.createElement('video')
      el.src = url
      el.crossOrigin = true
      el.playsInline = true
      el.muted = true
      el.loop = false
      el.addEventListener(
        'loadedmetadata',
        () => {
          el.pause()
          resolve(el)
        },
        { once: true }
      )
    })
    return new VideoTexture(media)
  } else {
    const loader = new TextureLoader()
    return await new Promise((resolve) =>
      loader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (err) => console.error(err)
      )
    )
  }
}

async function loadScene(url) {
  const loader = new GLTFLoader()
  const gltf = await new Promise((resolve) =>
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (err) => console.error(err)
    )
  )

  return gltf.scene
}

function unpackGroup(object) {
  if (object.isGroup) {
    return object.children
      .map((o) => unpackGroup(o))
      .flat()
      .filter((o) => o != null)
  }
  if (object.isMesh) {
    return [object]
  }
}

function parseAttribute(name, value) {
  switch (name) {
    case 'position':
    case 'bounds':
      return value?.split(' ').map((v) => +v)
    case 'rotation':
      return [...value.split(' ').map((v) => +v), 'YXZ']
    case 'layers':
      return [...value.matchAll(/'([^']+)'|"([^"]+)"|([^ ]+)/g)].map((d) => d[1] ?? d[2] ?? d[3])
    case 'fov':
    case 'far':
    case 'time':
      return +value
    case 'projection-type': {
      return ['perspective', 'orthographic', 'map'].includes(value) ? value : 'perspective'
    }
    case 'screen':
    case 'focus':
    case 'pass-through':
    case 'first-person':
      return value === '' || value === 'true'
    case 'controls':
      if (value === '' || value === 'true' || value === 'move') return 'move'
      if (value === 'edit') return 'edit'
      return false
    default:
      return value
  }
}

async function setupScene(url) {
  const meshes = unpackGroup(await loadScene(url))

  const base = new Group()
  base.name = 'vantage:base'

  const solidMaterial = new MeshPhongMaterial({ color: 0xeeeeee })
  const lineMaterial = new LineBasicMaterial({ color: 0x000000 })

  meshes.forEach((mesh) => {
    mesh.geometry.clearGroups()
    mesh.geometry.addGroup(0, Infinity, 0)
    mesh.material = [solidMaterial]
  })

  const edges = new Group()
  edges.name = 'vantage:edges'
  edges.add(
    ...meshes.map((mesh) => new LineSegments(new EdgesGeometry(mesh.geometry), lineMaterial))
  )

  base.add(...meshes, edges)

  const bbox = new Box3().setFromObject(base)
  const bounds = [bbox.max.z, bbox.min.z, bbox.min.x, bbox.max.x]

  return { base, bounds }
}

function setupLights() {
  const lights = new Group()
  lights.name = 'vantage:lights'

  lights.add(new AmbientLight(0xffffff, 0.8))

  const directional1 = new DirectionalLight(0xffffff, 3)
  const directional2 = new DirectionalLight(0xffffff, 3)
  directional1.position.set(1, 1, 1)
  directional2.position.set(-1, -1, -1)
  lights.add(directional1, directional2)

  return lights
}

function getActiveKeyframe(projection) {
  const keyframes = Array.from(projection.querySelectorAll('vantage-keyframe'))
  if (!keyframes.length) return null
  let active = keyframes[0]
  keyframes.forEach((kf) => {
    const t = parseFloat(kf.getAttribute('time')) || 0
    if (
      t <= (parseFloat(projection.closest('vantage-renderer').getAttribute('time')) || 0) &&
      t > (parseFloat(active.getAttribute('time')) || 0)
    ) {
      active = kf
    }
  })
  return active
}

function getSelectedKeyframe(projection) {
  const keyframes = Array.from(projection.querySelectorAll('vantage-keyframe'))
  const keyframeSelector = document.getElementById('keyframeSelector')
  if (keyframeSelector && keyframeSelector.options.length > 0) {
    const index = parseInt(keyframeSelector.value, 10)
    if (!isNaN(index) && keyframes[index]) return keyframes[index]
  }
  return getActiveKeyframe(projection)
}

export {
  loadTexture,
  loadScene,
  unpackGroup,
  parseAttribute,
  setupScene,
  setupLights,
  getSelectedKeyframe
}
