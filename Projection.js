import { PerspectiveCamera } from "three";
import ProjectedMaterial from "three-projected-material";

export default class Projection {
  camera;
  material = {
    buildings: null,
    ground: null,
    sky: null,
  };

  constructor(
    texture,
    cameraPosition = [0, 1.8, 0],
    cameraRotation = [0, 0, 1],
    fov = 60,
    aspectRatio = 16 / 9,
  ) {
    this.camera = new PerspectiveCamera(fov, aspectRatio, 1, 100);
    this.camera.position.set(...cameraPosition);
    this.camera.rotation.set(...cameraRotation);

    for (const layer in this.material) {
      this.material[layer] = new ProjectedMaterial({
        camera: this.camera,
        texture,
        color: "#ccc",
        transparent: true,
      });
    }
  }
}
