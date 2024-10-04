import { PerspectiveCamera, Vector3, Quaternion } from "three";

import { MapControls } from "three/addons/controls/MapControls";
import { PointerLockControls } from "./CustomPointerLockControls";

export default class CameraOperator {
  mapCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000);
  fpCamera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 10000);
  mapControls;
  projection;

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

    this.fpControls.addEventListener("change", (e, a, b) => {
      if (this.fpControls.attachedCamera != null) this.projection.update();
    });

    this.fpControls.enabled = false;

    document.addEventListener("keydown", this.keydown);
    document.addEventListener("mousedown", this.mousedown);
  }

  get camera() {
    return this.mapControls.enabled ? this.mapCamera : this.fpCamera;
  }

  map() {
    if (this.mapControls.enabled) return;

    this.mapControls.enabled = true;
    this.fpControls.enabled = false;
    this.fpControls.unlock();
    // this.projection = null;
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

  attachProjection = (projection, reverse) => {
    const source = reverse ? this.fpCamera : projection.camera;
    const target = reverse ? projection.camera : this.fpCamera;

    const pos = source.getWorldPosition(new Vector3());
    const quat = source.getWorldQuaternion(new Quaternion());
    target.position.set(...pos);
    target.setRotationFromQuaternion(quat);
    target.updateProjectionMatrix();

    this.projection = projection;
    this.projection.focus();

    if (reverse) this.projection.update();
  };

  detachProjection = () => {
    this.projection?.blur();
    this.projection = null;
  };

  keydown = ({ code, key, shiftKey }) => {
    if (code === "Enter") {
      this.toggle();
    }

    // if (this.mapControls.enabled) return;

    switch (code) {
      case "KeyQ":
        this.fpCamera.translateY(-1);
        break;

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

      case "KeyS":
        this.fpCamera.translateZ(1);
        break;

      case "ArrowRight":
      case "KeyD":
        this.fpCamera.translateX(1);
        break;
    }

    if (this.projection != null) {
      switch (code) {
        case "ArrowUp":
          this.projection.camera.fov++;
          break;

        case "ArrowLeft":
          this.projection.camera.rotateZ(0.02);
          break;

        case "ArrowDown":
          this.projection.camera.fov--;
          break;

        case "ArrowRight":
          this.projection.camera.rotateZ(-0.02);
          break;
      }
      this.projection.camera.position.set(
        ...this.fpCamera.getWorldPosition(new Vector3()),
      );
      this.projection.update();
    }
  };

  mousedown = (e) => {
    if (!this.fpControls.enabled || this.projection == null) return;
    this.fpControls.attachCamera(this.projection.camera);
    window.addEventListener("mouseup", () => this.fpControls.detachCamera(), {
      once: true,
    });
  };
}
