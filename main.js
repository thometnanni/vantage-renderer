import * as THREE from "three";

import { GUI } from "three/addons/libs/lil-gui.module.min";
import { generateBuildings } from "./city";

import CameraOperator from "./cameraOperator";
import Projection from "./Projection";

const geojsonUrl = "./nk-arcaden.json";

let scene,
  renderer,
  buildings,
  ground,
  sky,
  cameraOperator,
  size = 10000,
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

  const map = await fetch(geojsonUrl).then((d) => d.json());

  const buildingGeometry = generateBuildings(map);

  const wireframeMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000,
  });

  const solidMaterial = new THREE.MeshPhongMaterial({
    color: 0xeeeeee
  });

  const geo = new THREE.EdgesGeometry(buildingGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 5,
    linecap: 'round',
    linejoin: 'round'
  });

  const wireframe = new THREE.LineSegments(geo, lineMaterial);
  const solidMesh = new THREE.Mesh(buildingGeometry, solidMaterial);


  buildingGeometry.clearGroups();
  buildingGeometry.addGroup(0, Infinity, 0);
  buildingGeometry.addGroup(0, Infinity, 1);

  buildings = new THREE.Mesh(buildingGeometry, [
    wireframeMaterial,
    solidMaterial,
  ]);

  buildings.add(solidMesh);
  buildings.add(wireframe);

  buildings.name = "BUILDINGS";
  buildings.updateMatrix();
  buildings.layers.set(0);
  buildings.frustumCulled = false;
  // console.log(buildings);
  buildings.castShadow = true;

  scene.add(buildings);

  const groundGeometry = new THREE.PlaneGeometry(size, size);
  groundGeometry.rotateY(Math.PI);
  groundGeometry.rotateX(Math.PI / 2);
  groundGeometry.clearGroups();
  ground = new THREE.Mesh(groundGeometry, []);
  scene.add(ground);

  // DOME
  const skyGeometry = new THREE.PlaneGeometry(size, size, 2, 2);
  skyGeometry.rotateX(Math.PI / 2);
  skyGeometry.attributes.position.setX(0, -size / 4);
  skyGeometry.attributes.position.setZ(0, size / 4);
  skyGeometry.attributes.position.setX(2, size / 4);
  skyGeometry.attributes.position.setZ(2, size / 4);
  skyGeometry.attributes.position.setY(4, size);
  skyGeometry.attributes.position.setX(6, -size / 4);
  skyGeometry.attributes.position.setZ(6, -size / 4);
  skyGeometry.attributes.position.setX(8, size / 4);
  skyGeometry.attributes.position.setZ(8, -size / 4);
  skyGeometry.computeVertexNormals();
  skyGeometry.clearGroups();
  // skyGeometry.addGroup(0, Infinity, 0);
  sky = new THREE.Mesh(skyGeometry, []);
  scene.add(sky);

  projections.push(
    new Projection(
      { buildings, ground, sky },
      texture,
      undefined,
      [-3.3624176340181573, 0.046257221197621406, -3.1280158734032977],
      50,
    ),
  );

  projections.forEach((projection) => {
    projection.update();
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

  window.addEventListener("keydown", ({ code }) => {
    if (code === "Space") {
      cameraOperator.fp();
      cameraOperator.attachProjection(projections[0]);
    }
  });
}

function onWindowResize() {
  cameraOperator.camera.aspect = window.innerWidth / window.innerHeight;
  cameraOperator.camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function update() {
  renderer.render(scene, cameraOperator.camera);
}
