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
  mesh,
  planeMesh;

// console.log(image);

init();
//render(); // remove when using animation loop

async function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcccccc);
  scene.fog = new THREE.FogExp2(0xcccccc, 0.002);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    1000,
  );
  // camera.position.set(0, 200, -400);

  camera.position.set(
    -153.28062450688265,
    192.5591520894458,
    356.3707421214962,
  );
  // camera.rotation.set(
  //   -2.64007831672083,
  //   -0.020048985214325077,
  //   -3.1306015673609147
  // );

  camera.lookAt({
    x: -18.615903991952372,
    y: -2.6395477291672917,
    z: 652.5248779935566,
  });

  let target = new THREE.Vector3(
    -18.615903991952372,
    -2.6395477291672917,
    652.5248779935566,
  );

  // controls = new THREE.OrbitControls()

  projectionCamera = new THREE.PerspectiveCamera(
    63.300000000000004,
    16 / 9,
    1,
    1000,
  );
  projectionCamera.position.set(
    -115.17916447561632,
    22.457428304785132,
    508.8016951217737,
  );
  projectionCamera.rotation.set(
    -3.3624176340181573,
    0.046257221197621406,
    -3.1280158734032977,
  );
  // projectionCamera.lookAt(0, 0, 0);

  // controls

  controls = new MapControls(camera, renderer.domElement);

  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
  controls.dampingFactor = 0.05;

  controls.screenSpacePanning = false;

  controls.minDistance = 100;
  controls.maxDistance = 500;

  controls.maxPolarAngle = Math.PI / 2;

  controls.target = target;
  controls.saveState();

  controls.update();

  // world

  // const geometry = new THREE.BoxGeometry();
  // geometry.translate(0, 0.5, 0);
  // const material = new THREE.MeshPhongMaterial({
  //   color: 0xeeeeee,
  //   flatShading: true,
  // });

  // for (let i = 0; i < 500; i++) {
  //   const mesh = new THREE.Mesh(geometry, material);
  //   mesh.position.x = Math.random() * 1600 - 800;
  //   mesh.position.y = 0;
  //   mesh.position.z = Math.random() * 1600 - 800;
  //   mesh.scale.x = 20;
  //   mesh.scale.y = Math.random() * 80 + 10;
  //   mesh.scale.z = 20;
  //   mesh.updateMatrix();
  //   mesh.matrixAutoUpdate = false;
  //   scene.add(mesh);
  // }
  //
  const map = await fetch(geojsonUrl).then((d) => d.json());

  const { buildings } = generateCity(map.features);

  const material = new THREE.MeshPhongMaterial({
    color: 0xfafafa,
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

  console.log(texture);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);

  projMaterial1 = new ProjectedMaterial({
    camera: projectionCamera, // the camera that acts as a projector
    texture, // the texture being projected
    // textureScale: 1, // scale down the texture a bit
    // textureOffset: new THREE.Vector2(0.1, 0.1), // you can translate the texture if you want
    cover: false, // enable background-size: cover behaviour, by default it's like background-size: contain
    color: "#ccc", // the color of the object if it's not projected on
    // roughness: 0.3, // you can pass any other option that belongs to MeshPhysicalMaterial
  });

  projMaterial2 = new ProjectedMaterial({
    camera: projectionCamera, // the camera that acts as a projector
    texture, // the texture being projected
    textureScale: 0.8, // scale down the texture a bit
    textureOffset: new THREE.Vector2(0.1, 0.1), // you can translate the texture if you want
    cover: false, // enable background-size: cover behaviour, by default it's like background-size: contain
    color: "#ccc", // the color of the object if it's not projected on
    // roughness: 0.3, // you can pass any other option that belongs to MeshPhysicalMaterial
  });

  console.log(camera.rotation.x);

  const material3 = new THREE.MeshBasicMaterial({
    map: texture,
  });

  mesh = new THREE.Mesh(buildings, projMaterial1);

  mesh.name = "BUILDINGS";
  mesh.updateMatrix();
  // buildingGeometry.merge(mesh);
  mesh.layers.set(0);
  mesh.frustumCulled = false;
  // console.log(mesh);
  mesh.castShadow = true;

  console.log(mesh);

  mesh.scale.x = 250;
  mesh.scale.y = 250;
  mesh.scale.z = 250;
  scene.add(mesh);

  const plane = new THREE.PlaneGeometry(10000, 10000);
  plane.rotateY(Math.PI);
  plane.rotateX(Math.PI / 2);
  planeMesh = new THREE.Mesh(plane, projMaterial2);
  scene.add(planeMesh);

  projMaterial1.project(mesh);
  projMaterial2.project(planeMesh);

  // lights

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight1.position.set(1, 1, 1);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 3);
  dirLight2.position.set(-1, -1, -1);
  scene.add(dirLight2);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  //

  const helper = new THREE.CameraHelper(projectionCamera);
  scene.add(helper);

  window.addEventListener("resize", onWindowResize);

  const gui = new GUI();
  gui.add(controls, "zoomToCursor");
  gui.add(controls, "screenSpacePanning");
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

    projMaterial1.project(mesh);
    projMaterial2.project(planeMesh);
  }
});

// const building = map.features.find((f) => f.properties?.building != null);
