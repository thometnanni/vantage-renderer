import { PerspectiveCamera, CameraHelper, Color } from "three";
import ProjectedMaterial from "three-projected-material";

export default class Projection {
  camera;
  layers;
  material = {};
  helper;

  constructor(
    layers,
    texture,
    cameraPosition = [0, 1.8, 0],
    cameraRotation = [0, 0, 1],
    fov = 60,
    aspectRatio = 16 / 9,
  ) {
    this.layers = layers;

    this.camera = new PerspectiveCamera(fov, aspectRatio, 1, 100);
    this.camera.position.set(...cameraPosition);
    this.camera.rotation.set(...cameraRotation);

    for (const layer in this.layers) {
      this.material[layer] = new ProjectedMaterial({
        camera: this.camera,
        texture,
        color: "#ccc",
        transparent: true,
      });
      this.layers[layer].geometry.addGroup(
        0,
        Infinity,
        this.layers[layer].geometry.groups.length,
      );
      this.layers[layer].material.push(this.material[layer]);
    }

    this.helper = new CameraHelper(this.camera);
    this.#setHelperColor(0xffffff);
  }

  blur = () => {
    this.#setHelperColor(0xffffff);
  };

  focus = () => {
    console.log("focus");
    this.#setHelperColor(0x0000ff);
    // this.helper.setColors(
    //   this.#helperColorActive,
    //   this.#helperColorActive,
    //   this.#helperColorActive,
    //   this.#helperColorActive,
    //   this.#helperColorActive,
    // );
  };

  #setHelperColor = (color) => {
    const c = new Color(color);
    this.helper.setColors(c, c, c, c, c);
  };

  update = () => {
    for (const layer in this.layers) {
      this.material[layer].project(this.layers[layer]);
    }
  };
}
