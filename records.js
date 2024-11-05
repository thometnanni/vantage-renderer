export default [
  {
    media: ["./media/osm.png", "./media/aerial.jpg"],
    type: "image",
    camera: {
      bounds: {
        top: 52.47608904123904,
        left: 13.4197998046875,
        bottom: 52.46605036188952,
        right: 13.43902587890625,
      },
      position: [0, 64, 0],
      rotation: [-Math.PI / 2, 0, 0, "XYZ"],
      ratio: -1,
      far: 100,
      size: 500,
      orthographic: true,
    },
  },
  {
    media: [
      "https://media.thometnanni.net/long-story.mp4",
      "./media/long-story-still.jpg",
    ],
    type: "image",
    camera: {
      position: [-88.07762977999406, 2.9753309014212492, 51.20231969741984],
      rotation: [
        -0.0045529476020663585,
        -0.5548026271805397,
        -0.011898047553531497,
        "XYZ",
      ],
      fov: 60.099999999999994,
      ratio: 0.75,
      far: 150,
      size: null,
    },
  },
  {
    media: "./media/IMG_3271.jpeg",
    type: "image",
    camera: {
      position: [-35.30228944410629, 1.694005810894541, 33.5939234089535],
      rotation: [0.03812997809, 4.7123889804, -0.009499654136, "YXZ"],
      fov: 53.1,
      ratio: 0.75,
      far: 73.25,
      size: null,
    },
  },
  // {
  //   media: "./media/warthe-eck.jpg",
  //   type: "image",
  //   camera: {
  //     position: [-35.30228944410629, 1.694005810894541, 33.5939234089535],
  //     rotation: [0.03812997809, 4.7123889804, -0.009499654136, "YXZ"],
  //     fov: 53.1,
  //     ratio: 0.75,
  //     far: 180,
  //     size: null,
  //   },
  // },
];
