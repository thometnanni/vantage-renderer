import { VideoTexture, TextureLoader } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

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
    return new VideoTexture(media)
  } else {
    const loader = new TextureLoader()
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

export { loadTexture, loadScene, unpackMeshes }
