import * as THREE from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { generateCity } from "./city";

import { MapControls } from "three/addons/controls/MapControls.js";
import ProjectedMaterial from "three-projected-material";

const geojsonUrl = "./nk-arcaden.json";

let camera,
  controls,
  scene,
  renderer,
  projectionCamera,
  projMaterial1,
  projMaterial2,
  screen,
  screen2,
  cameraHelper,
  spotLightHelper;

const projection = {
  fov: 30,
};

// console.log(image);

init();
//render(); // remove when using animation loop

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  // scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000,
  );
  // camera.position.set(0, 200, -400);

  camera.position.set(0, 100, -150);
  // camera.rotation.set(
  //   -2.64007831672083,
  //   -0.020048985214325077,
  //   -3.1306015673609147
  // );

  camera.lookAt({
    x: 0,
    y: 0,
    z: 0,
  });

  projectionCamera = new THREE.PerspectiveCamera(30, 16 / 9, 1, 1000);
  const projectionOffset = 100;
  projectionCamera.position.set(projectionOffset, 0, -100);
  projectionCamera.lookAt(projectionOffset, 0, 0);

  // CONTROLS
  controls = new MapControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 100;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI / 2;

  const material = new THREE.MeshPhongMaterial({
    color: 0xffddff,
  });

  const video = document.getElementById("video");
  video.play();
  const texture = new THREE.VideoTexture(video);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);

  projMaterial1 = new ProjectedMaterial({
    camera: projectionCamera, // the camera that acts as a projector
    texture, // the texture being projected
    cover: false, // enable background-size: cover behaviour, by default it's like background-size: contain
    color: "#fff", // the color of the object if it's not projected on
    transparent: true,
  });

  projMaterial2 = new ProjectedMaterial({
    camera: projectionCamera, // the camera that acts as a projector
    texture, // the texture being projected
    cover: false, // enable background-size: cover behaviour, by default it's like background-size: contain
    color: "#fff", // the color of the object if it's not projected on
    transparent: true,
  });

  // SCREEN

  const geometry = new THREE.BoxGeometry(300, 80, 20);
  geometry.clearGroups();
  geometry.addGroup(0, Infinity, 0);
  geometry.addGroup(0, Infinity, 1);
  screen = new THREE.Mesh(geometry, [material, projMaterial1]);
  // screen.castShadow = true;
  screen.updateMatrix();
  // buildingGeometry.merge(screen);
  screen.layers.set(0);
  screen.frustumCulled = false;
  // console.log(screen);
  screen.castShadow = true;
  screen.receiveShadow = true;

  const geometry2 = new THREE.BoxGeometry(9000, 2000, 20);
  geometry2.clearGroups();
  geometry2.addGroup(0, Infinity, 0);
  geometry2.addGroup(0, Infinity, 1);
  screen2 = new THREE.Mesh(geometry2, [material, projMaterial2]);
  screen2.position.z = 200;
  screen2.castShadow = true;
  screen2.receiveShadow = true;

  scene.add(screen, screen2);

  console.log(camera.rotation.x);
  projMaterial1.project(screen);
  projMaterial2.project(screen2);

  // SPOTLIGHT

  const spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(-projectionOffset, 0, -100);
  const targetObject = new THREE.Object3D();
  targetObject.position.set(-projectionOffset, 0, 0);
  scene.add(targetObject);

  spotLight.target = targetObject;
  spotLight.decay = 0;

  spotLight.shadow.focus = 0.7;
  spotLight.angle = (Math.PI / 180) * 30;
  spotLight.map = texture;

  spotLight.castShadow = true;

  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;

  spotLight.shadow.camera.near = 50;
  spotLight.shadow.camera.far = 350;
  spotLight.shadow.camera.fov = 30;

  scene.add(spotLight);

  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.2);
  dirLight1.position.set(0, 0, -100);
  dirLight1.castShadow = true;
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  // scene.add(ambientLight);

  // HELPER

  cameraHelper = new THREE.CameraHelper(projectionCamera);
  scene.add(cameraHelper);

  spotLightHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(spotLightHelper);

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();
  gui.add(controls, "zoomToCursor");
  gui.add(controls, "screenSpacePanning");
  const projectionFolder = gui.addFolder("Projection");
  projectionFolder.add(projection, "fov", 1, 90).onChange((val) => {
    projectionCamera.fov = val;
    projMaterial1.project(screen);
    projMaterial2.project(screen2);
    cameraHelper.update();

    spotLight.angle = (Math.PI / 180) * val;
    spotLightHelper.update();
  });
  projectionFolder.open();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true
  // console.log(camera);

  render();
}

function render() {
  renderer.render(scene, camera);
}

window.addEventListener("keydown", ({ code, key, shiftKey }) => {
  if (code === "Space") {
    console.log("user camera");
    console.log(
      [camera.position.x, camera.position.y, camera.position.z].join(", "),
    );

    console.log(
      [camera.rotation.x, camera.rotation.y, camera.rotation.z].join(", "),
    );

    console.log("projection camera");
    console.log(
      [
        projectionCamera.position.x,
        projectionCamera.position.y,
        projectionCamera.position.z,
      ].join(", "),
    );

    console.log(
      [
        projectionCamera.rotation.x,
        projectionCamera.rotation.y,
        projectionCamera.rotation.z,
      ].join(", "),
    );
  } else {
    const posFactor = shiftKey ? 0.1 : 1;
    const rotFactor = shiftKey ? 0.01 : 0.1;
    const fovFactor = shiftKey ? 0.1 : 1;

    let x = projectionCamera.position.x;
    let y = projectionCamera.position.y;
    let z = projectionCamera.position.z;

    let rx = projectionCamera.rotation.x;
    let ry = projectionCamera.rotation.y;
    let rz = projectionCamera.rotation.z;

    let fov = projectionCamera.fov;
    console.log(key, code);
    switch (key.toLowerCase()) {
      case "q":
        y += posFactor;
        break;
      case "e":
        y -= posFactor;
        break;
      case "w":
        z += posFactor;
        break;
      case "s":
        z -= posFactor;
        break;
      case "a":
        x += posFactor;
        break;
      case "d":
        x -= posFactor;
        break;

      case "u":
        rz += rotFactor;
        break;
      case "o":
        rz -= rotFactor;
        break;
      case "i":
        rx += rotFactor;
        break;
      case "k":
        rx -= rotFactor;
        break;
      case "j":
        ry += rotFactor;
        break;
      case "l":
        ry -= rotFactor;
        break;

      case "arrowup":
        fov += fovFactor;
        break;
      case "arrowdown":
        fov -= fovFactor;
        break;

      case "n":
        controls.saveState();
        console.log("controls target");
        console.log(
          [controls.target.x, controls.target.y, controls.target.z].join(", "),
        );
        controls.position0.set(
          -153.28062450688265,
          192.5591520894458,
          356.3707421214962,
        );
        break;
      case "m":
        controls.reset();
        break;

      case "x":
        console.log("projection camera");
        console.log(
          [
            projectionCamera.position.x,
            projectionCamera.position.y,
            projectionCamera.position.z,
          ].join(", "),
        );

        console.log(
          [
            projectionCamera.rotation.x,
            projectionCamera.rotation.y,
            projectionCamera.rotation.z,
          ].join(", "),
        );
        console.log(projectionCamera.fov);
        break;
    }

    projectionCamera.position.set(x, y, z);
    projectionCamera.rotation.set(rx, ry, rz);
    projectionCamera.fov = fov;

    projMaterial1.project(screen);
    projMaterial2.project(screen2);

    cameraHelper.update();
  }
});

// const building = map.features.find((f) => f.properties?.building != null);
