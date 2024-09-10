import * as THREE from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min";
import { generateBuildings } from "./city";

import { MapControls } from "three/addons/controls/MapControls";
import { PointerLockControls } from "three/addons/controls/PointerLockControls";
import ProjectedMaterial from "three-projected-material";

import CameraOperator from "./cameraOperator";

const geojsonUrl = "./nk-arcaden.json";

let camera,
  controls,
  scene,
  renderer,
  projectionCamera,
  projectionMaterial,
  mesh,
  planeMesh,
  cameraOperator;

init();

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  // scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(update);

  document.body.appendChild(renderer.domElement);

  cameraOperator = new CameraOperator(renderer);

  projectionCamera = new THREE.PerspectiveCamera(60, 16 / 9, 1, 100);
  projectionCamera.position.set(0, 1.8, 0);
  projectionCamera.rotation.set(
    -3.3624176340181573,
    0.046257221197621406,
    -3.1280158734032977,
  );

  const map = await fetch(geojsonUrl).then((d) => d.json());

  const buildings = generateBuildings(map);

  const material = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    wireframe: true,
  });

  // const loader = new THREE.TextureLoader();
  // const texture = await new Promise((resolve) =>
  //   loader.load(
  //     image,
  //     (texture) => resolve(texture),
  //     undefined,
  //     (err) => console.error(err)
  //   )
  // );

  const video = document.getElementById("video");
  video.play();
  const texture = new THREE.VideoTexture(video);

  projectionMaterial = [0, 1, 2, 3, 4, 5, 6].map((d) => {
    return new ProjectedMaterial({
      camera: projectionCamera,
      texture,
      color: "#ccc",
      transparent: true,
      // wireframe: true,
    });
  });

  // console.log(camera.rotation.x);

  buildings.clearGroups();
  buildings.addGroup(0, Infinity, 0);
  buildings.addGroup(0, Infinity, 1);

  mesh = new THREE.Mesh(buildings, [projectionMaterial[0], material]);

  mesh.name = "BUILDINGS";
  mesh.updateMatrix();
  // buildingGeometry.merge(mesh);
  mesh.layers.set(0);
  mesh.frustumCulled = false;
  // console.log(mesh);
  mesh.castShadow = true;

  // mesh.scale.x = 250;
  // mesh.scale.y = 250;
  // mesh.scale.z = 250;
  scene.add(mesh);

  const plane = new THREE.PlaneGeometry(10000, 10000);
  plane.rotateY(Math.PI);
  plane.rotateX(Math.PI / 2);
  planeMesh = new THREE.Mesh(plane, projectionMaterial[1]);
  scene.add(planeMesh);

  projectionMaterial[0].project(mesh);
  projectionMaterial[1].project(planeMesh);

  // Dome

  // for (let i = 0; i < 4; i++) {
  //   const domeGeometry = new THREE.PlaneGeometry(10000, 10000);
  //   projectionMaterial[2].side = THREE.BackSide;
  //   const domeMaterial = new THREE.MeshPhongMaterial({
  //     color: 0xff0000,
  //     map: texture,
  //   });
  //   var dome = new THREE.Mesh(domeGeometry, domeMaterial);
  //   scene.add(dome);
  //   dome.position.z = -5000;
  //   dome.rotateY((Math.PI / 2) * i);
  // }
  // const domeGeometry = new THREE.PlaneGeometry(10000, 10000);
  // domeGeometry.rotateY(Math.PI);
  // projectionMaterial[2].side = THREE.BackSide;
  // const domeMaterial = new THREE.MeshPhongMaterial({
  //   color: 0xff0000,
  //   map: texture,
  // });
  // var dome = new THREE.Mesh(domeGeometry, domeMaterial);
  // scene.add(dome);
  // dome.position.z = -5000;
  // projectionMaterial[2].project(dome);

  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  // HELPER

  const helper = new THREE.CameraHelper(projectionCamera);
  scene.add(helper);

  window.addEventListener("resize", onWindowResize);

  const options = {
    // camera,
    "toggle camera": () => cameraOperator.toggle(),
  };

  const gui = new GUI();
  gui.add(options, "toggle camera");

  // gui.add(options, "camera", { map: camera, projection: projectionCamera });
}

function onWindowResize() {
  cameraOperator.camera.aspect = window.innerWidth / window.innerHeight;
  cameraOperator.camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function update() {
  if (projectionMaterial != null) {
    // projectionMaterial[0].project(mesh);
    // projectionMaterial[1].project(planeMesh);
  }
  renderer.render(scene, cameraOperator.camera);
}
document.addEventListener("keydown", ({ code, key, shiftKey }) => {
  if (code === "Enter") {
    cameraOperator.toggle();
  }
});

// document.addEventListener("keydown", ({ code, key, shiftKey }) => {
//   console.log("key-pressed");
//   if (code === "Enter") {
//     placeProjection();
//   }
//   if (code === "Space") {
//     console.log("user camera");
//     console.log(
//       [camera.position.x, camera.position.y, camera.position.z].join(", "),
//     );

//     console.log(
//       [camera.rotation.x, camera.rotation.y, camera.rotation.z].join(", "),
//     );

//     console.log("projection camera");
//     console.log(
//       [
//         projectionCamera.position.x,
//         projectionCamera.position.y,
//         projectionCamera.position.z,
//       ].join(", "),
//     );

//     console.log(
//       [
//         projectionCamera.rotation.x,
//         projectionCamera.rotation.y,
//         projectionCamera.rotation.z,
//       ].join(", "),
//     );
//   } else {
//     const posFactor = shiftKey ? 0.1 : 1;
//     const rotFactor = shiftKey ? 0.01 : 0.1;
//     const fovFactor = shiftKey ? 0.1 : 1;

//     let x = projectionCamera.position.x;
//     let y = projectionCamera.position.y;
//     let z = projectionCamera.position.z;

//     let rx = projectionCamera.rotation.x;
//     let ry = projectionCamera.rotation.y;
//     let rz = projectionCamera.rotation.z;

//     let fov = projectionCamera.fov;
//     console.log(key, code);
//     switch (key.toLowerCase()) {
//       case "q":
//         y += posFactor;
//         break;
//       case "e":
//         y -= posFactor;
//         break;
//       case "w":
//         z += posFactor;
//         break;
//       case "s":
//         z -= posFactor;
//         break;
//       case "a":
//         x += posFactor;
//         break;
//       case "d":
//         x -= posFactor;
//         break;

//       case "u":
//         rz += rotFactor;
//         break;
//       case "o":
//         rz -= rotFactor;
//         break;
//       case "i":
//         rx += rotFactor;
//         break;
//       case "k":
//         rx -= rotFactor;
//         break;
//       case "j":
//         ry += rotFactor;
//         break;
//       case "l":
//         ry -= rotFactor;
//         break;

//       case "arrowup":
//         fov += fovFactor;
//         break;
//       case "arrowdown":
//         fov -= fovFactor;
//         break;

//       case "n":
//         controls.saveState();
//         console.log("controls target");
//         console.log(
//           [controls.target.x, controls.target.y, controls.target.z].join(", "),
//         );
//         controls.position0.set(
//           -153.28062450688265,
//           192.5591520894458,
//           356.3707421214962,
//         );
//         break;
//       case "m":
//         controls.reset();
//         break;

//       case "x":
//         console.log("projection camera");
//         console.log(
//           [
//             projectionCamera.position.x,
//             projectionCamera.position.y,
//             projectionCamera.position.z,
//           ].join(", "),
//         );

//         console.log(
//           [
//             projectionCamera.rotation.x,
//             projectionCamera.rotation.y,
//             projectionCamera.rotation.z,
//           ].join(", "),
//         );
//         console.log(projectionCamera.fov);
//         break;
//     }

//     projectionCamera.position.set(x, y, z);
//     projectionCamera.rotation.set(rx, ry, rz);
//     projectionCamera.fov = fov;

//     projectionMaterial[0].project(mesh);
//     projectionMaterial[1].project(planeMesh);
//   }
// });

// const building = map.features.find((f) => f.properties?.building != null);
