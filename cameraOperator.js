import { PerspectiveCamera } from "three";

import { MapControls } from "three/addons/controls/MapControls";
import { PointerLockControls } from "three/addons/controls/PointerLockControls";

export default class CameraOperator {
  mapCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000);
  fpCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000);
  mapControls;

  constructor(renderer, mapCameraPosition = [0, 100, -100]) {
    this.renderer = renderer;
    this.mapCamera.position.set(...mapCameraPosition);

    this.mapControls = new MapControls(
      this.mapCamera,
      this.renderer.domElement,
    );
    this.mapControls.minDistance = 10;
    this.mapControls.maxDistance = 1000;

    this.fpControls = new PointerLockControls(this.fpCamera, document.body);

    this.fpControls.addEventListener("unlock", () => {
      this.map();
    });

    this.fpControls.addEventListener("change", () => {
      // console.log();
    });

    this.fpControls.enabled = false;

    document.addEventListener("keydown", this.keydown);
  }

  get camera() {
    return this.mapControls.enabled ? this.mapCamera : this.fpCamera;
  }

  map() {
    if (this.mapControls.enabled) return;

    this.mapControls.enabled = true;
    this.fpControls.enabled = false;
    this.fpControls.unlock();
  }

  fp() {
    if (this.fpControls.enabled) return;

    this.mapControls.enabled = false;
    this.fpControls.enabled = true;
    this.fpControls.lock();
  }

  toggle = () => {
    if (this.mapControls.enabled) this.fp();
    else this.map();
  };

  keydown = ({ code, key, shiftKey }) => {
    if (code === "Enter") {
      this.toggle();
    }

    switch (code) {
      case "KeyQ":
        this.fpCamera.translateY(-1);
        break;

      case "ArrowUp":
      case "KeyW":
        this.fpCamera.translateZ(-1);
        break;

      case "KeyE":
        this.fpCamera.translateY(1);
        break;

      case "ArrowLeft":
      case "KeyA":
        this.fpCamera.translateX(-1);
        break;

      case "ArrowDown":
      case "KeyS":
        this.fpCamera.translateZ(1);
        break;

      case "ArrowRight":
      case "KeyD":
        this.fpCamera.translateX(1);
        break;
    }
  };
}
