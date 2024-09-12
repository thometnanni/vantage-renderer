import { PerspectiveCamera } from "three";
import ProjectedMaterial from "three-projected-material";

export default class Projection {
  camera;
  layers;
  material = {};

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
  }

  update = () => {
    for (const layer in this.layers) {
      this.material[layer].project(this.layers[layer]);
    }
  };
}
