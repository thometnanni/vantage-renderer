export default [
  {
    media: ['./media/map.png'],
    camera: {
      position: [0, 64, 0],
      rotation: [-Math.PI / 2, -Math.PI / 2, 0, 'YXZ'],
      far: 100,
      size: 500,
      orthographic: true
    }
  },
  {
    media: [
      'https://media.thometnanni.net/long-story.mp4',
      './media/long-story-still.jpg'
    ],
    camera: {
      position: [-88.07762977999406, 2.9753309014212492, 51.20231969741984],
      rotation: [
        -0.0045529476020663585,
        -0.5548026271805397,
        -0.011898047553531497,
        'XYZ'
      ],
      fov: 60.099999999999994,
      ratio: 0.75,
      far: 150,
      size: null
    }
  },
  {
    media: './media/IMG_3271.jpeg',
    camera: {
      position: [-35.30228944410629, 1.694005810894541, 33.5939234089535],
      rotation: [0.03812997809, 4.7123889804, -0.009499654136, 'YXZ'],
      fov: 53.1,
      ratio: 0.75,
      far: 73.25,
      size: null
    }
  }
]
