import * as THREE from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min";
import { generateBuildings } from "./city";

import CameraOperator from "./cameraOperator";
import Projection from "./Projection";

const geojsonUrl = "./nk-arcaden.json";

let scene,
  renderer,
  mesh,
  planeMesh,
  cameraOperator,
  projections = [];

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

  projections.push(
    new Projection(
      texture,
      undefined,
      [-3.3624176340181573, 0.046257221197621406, -3.1280158734032977],
    ),
  );

  const map = await fetch(geojsonUrl).then((d) => d.json());

  const buildings = generateBuildings(map);

  const material = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    wireframe: true,
  });

  buildings.clearGroups();
  buildings.addGroup(0, Infinity, 0);
  buildings.addGroup(0, Infinity, 1);

  mesh = new THREE.Mesh(buildings, [
    ...projections.map((p) => p.material.buildings),
    material,
  ]);

  mesh.name = "BUILDINGS";
  mesh.updateMatrix();
  mesh.layers.set(0);
  mesh.frustumCulled = false;
  // console.log(mesh);
  mesh.castShadow = true;

  scene.add(mesh);

  const plane = new THREE.PlaneGeometry(10000, 10000);
  plane.rotateY(Math.PI);
  plane.rotateX(Math.PI / 2);
  planeMesh = new THREE.Mesh(plane, [
    ...projections.map((p) => p.material.ground),
  ]);
  scene.add(planeMesh);

  projections.forEach((projection) => {
    projection.material.buildings.project(mesh);
    projection.material.ground.project(planeMesh);
  });

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

  const helper = new THREE.CameraHelper(projections[0].camera);
  scene.add(helper);

  window.addEventListener("resize", onWindowResize);

  const options = {
    "toggle camera": cameraOperator.toggle,
  };

  const gui = new GUI();
  gui.add(options, "toggle camera");
}

function onWindowResize() {
  cameraOperator.camera.aspect = window.innerWidth / window.innerHeight;
  cameraOperator.camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function update() {
  renderer.render(scene, cameraOperator.camera);
}
