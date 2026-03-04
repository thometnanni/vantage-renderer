import { VideoTexture, TextureLoader, AmbientLight, DirectionalLight, Group } from 'three'

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
      el.play()
      el.addEventListener(
        'playing',
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

export { loadTexture, setupLights }
