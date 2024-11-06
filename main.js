import * as THREE from "three";

import center from "@turf/center";
import { GUI } from "three/addons/libs/lil-gui.module.min";
import { generateBuildings, toMeters } from "./city";

import CameraOperator from "./cameraOperator";
import Projection from "./Projection";

import records from "./records";

// const geojsonUrl = "./nk-arcaden.json";
const geojsonUrl = "./hermannstrasse.json";
const imageUrl = "./media/warthe-helper.png";

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

  cameraOperator = new CameraOperator(
    renderer,
    [-118.89, 28.07, 14.24],
    [-1.8891596839718918, -1.266917979002451, -1.9033664838293778, "XYZ"],
  );

  const map = await fetch(geojsonUrl).then((d) => d.json());
  const mapCenter = center(map);

  const buildingGeometry = generateBuildings(
    map,
    mapCenter,
    [13.4197998046875, 52.46605036188952, 13.43902587890625, 52.47608904123904],
  );

  const wireframeMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000,
  });

  const solidMaterial = new THREE.MeshPhongMaterial({
    color: 0xeeeeee,
  });

  const geo = new THREE.EdgesGeometry(buildingGeometry);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 5,
    linecap: "round",
    linejoin: "round",
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

  const groundGeometry = new THREE.BoxGeometry(size, size, 1);
  groundGeometry.rotateY(Math.PI);
  groundGeometry.rotateX(Math.PI / 2);
  groundGeometry.clearGroups();
  groundGeometry.addGroup(0, Infinity, 0);
  ground = new THREE.Mesh(groundGeometry, [solidMaterial]);
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

  const promises = records.map(async (record) => {
    const url = Array.isArray(record.media) ? record.media[0] : record.media;

    const texture = await loadTexture(url);

    //   new Promise((resolve) =>
    //   loader.load(
    //     url,
    //     (texture) => resolve(texture),
    //     undefined,
    //     (err) => console.error(err),
    //   ),
    // );

    return { texture, record };
  });

  await Promise.all(promises).then((d) => {
    projections.push(
      ...d.map(({ record, texture }) => {
        const {
          position,
          rotation,
          fov,
          ratio,
          far,
          orthographic,
          size,
          bounds,
        } = record.camera;

        return new Projection({
          renderer,
          scene,
          layers: { buildings, ground, sky },
          texture,
          textureSource: Array.isArray(record.media)
            ? record.media[0]
            : record.media,
          cameraPosition: position,
          cameraRotation: rotation,
          bounds,
          fov,
          ratio,
          far,
          orthographic,
          size,
          center: mapCenter,
        });
      }),
    );
  });

  projections.forEach((projection) => {
    projection.update();
    scene.add(projection.helper);
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
  // const dot = new THREE.Mesh(
  //   new THREE.SphereGeometry(4),
  //   new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  // );
  // const coordinate = [13.422461, 52.472694];
  // const local = toMeters(mapCenter, mapCenter);
  // dot.position.set(local.x, 0, local.y);
  // scene.add(dot);

  window.addEventListener("resize", onWindowResize);

  const keys = {
    fpv: "first person [⏎]",
    projection: `projection [0-${Math.min(projections.length - 1, 9)}]`,
    fov: "fov",
  };
  const options = {
    fpv: false,
    [keys.projection]: null,
    // [keys.fov]: 50,
  };

  const camOptions = {
    none: null,
    map: 0,
  };

  for (let i = 1; i < projections.length; i++) {
    camOptions[`cam ${i}`] = i;
  }

  const gui = new GUI();
  const guiControllerFPV = gui
    .add(options, "fpv")
    .name("first person [⏎]")
    .onChange(() => {
      cameraOperator.toggle();
      document.activeElement.blur();
    });
  gui.add(options, keys.projection, camOptions).onChange((value) => {
    const removeControllers = [
      "texture",
      "fov",
      "x",
      "y",
      "z",
      "yaw",
      "pitch",
      "roll",
      "far",
      "textureSource",
      "buildings",
      "ground",
      "plane",
    ];
    gui.controllers
      .filter(({ property }) => removeControllers.includes(property))
      .forEach((c) => c.destroy());
    if (value == null) {
      cameraOperator.detachProjection();
    } else {
      cameraOperator.attachProjection(projections[value]);

      if (Array.isArray(records[value].media)) {
        gui
          .add(cameraOperator.projection, "textureSource", records[value].media)
          .name("texture")
          .onChange(async (url) => {
            const texture = await loadTexture(url);
            cameraOperator.projection.updateTexture(texture);

            // cameraOperator.projection.material.ground.visible = false;
            // console.log(
            //   (cameraOperator.projection.material.ground =
            //     new THREE.MeshBasicMaterial({ color: 0xff0000 })),
            // );
            // cameraOperator.projection.layers.ground.material
          });
      }
      // const textureOptions
      // gui.add(cameraOperator.projection.camera, "fov", 5, 170).onChange(() => {
      //   cameraOperator.projection.update();
      // });

      gui.add(cameraOperator.projection.renderToLayer, "buildings");
      gui.add(cameraOperator.projection.renderToLayer, "ground");
      gui.add(cameraOperator.projection.renderToLayer, "plane");

      if (cameraOperator.projection.camera.isOrthographicCamera) return;
      gui.add(cameraOperator.projection.camera, "fov", 5, 170).onChange(() => {
        cameraOperator.projection.update();
      });
      gui
        .add(cameraOperator.projection.camera.position, "x", -500, 500)
        .onChange(() => {
          cameraOperator.projection.update();
        });
      gui
        .add(cameraOperator.projection.camera.position, "z", -500, 500)
        .name("y")
        .onChange(() => {
          cameraOperator.projection.update();
        });
      gui
        .add(cameraOperator.projection.camera.position, "y")
        .name("height")
        .onChange(() => {
          3;
          cameraOperator.projection.update();
        });

      const rotation = new THREE.Vector3(
        ...[...cameraOperator.projection.camera.rotation].map(
          (v) => (v * (180 / Math.PI)) % 180,
        ),
      );

      gui
        .add(rotation, "x", -90, 90)
        .name("pitch")
        .onChange((v) => {
          const current = cameraOperator.projection.camera.rotation.x;
          const diff = v / (180 / Math.PI) - current;
          cameraOperator.projection.camera.rotateX(diff);
          // cameraOperator.projection.camera.rotation.x = v / (180 / Math.PI);
          // cameraOperator.projection.camera.setRotationFromEuler(
          //   new THREE.Euler(...rotation, "ZYX"),
          // );
          cameraOperator.projection.update();
        });

      gui
        .add(rotation, "y", -180, 180)
        .name("yaw")
        .onChange((v) => {
          cameraOperator.projection.camera.rotation.y = v / (180 / Math.PI);
          // cameraOperator.projection.camera.setRotationFromEuler(
          //   new THREE.Euler(...rotation, "XYZ"),
          // );
          cameraOperator.projection.update();
        });

      gui
        .add(rotation, "z", -180, 180)
        .name("roll")
        .onChange((v) => {
          cameraOperator.projection.camera.rotation.z = v / (180 / Math.PI);
          // cameraOperator.projection.camera.setRotationFromEuler(
          //   new THREE.Euler(...rotation, "XYZ"),
          // );
          cameraOperator.projection.update();
        });

      gui
        .add(cameraOperator.projection.camera, "far", 1, 1000)
        .name("distance")
        .onChange((v) => {
          // cameraOperator.projection.camera.rotation.z = v / (180 / Math.PI);
          // cameraOperator.projection.camera.setRotationFromEuler(
          //   new THREE.Euler(...rotation, "XYZ"),
          // );
          cameraOperator.projection.update();
        });
    }
  });
  // gui.add(options, keys.fov, 1, 170).onChange((value) => {
  //   if (cameraOperator.projection == null) return;
  //   cameraOperator.projection.camera.fov = value;
  //   cameraOperator.projection.update();
  // });

  window.addEventListener("keydown", async ({ code, shiftKey }) => {
    const digit = /^Digit([0-9])/.exec(code)?.[1];
    if (digit != null) {
      const index = +digit;
      const guiController = gui.controllers.find(
        ({ property }) => property === keys.projection,
      );
      if (
        index >= projections.length ||
        projections[index] === cameraOperator.projection
      ) {
        // cameraOperator.detachProjection();
        guiController.setValue(null);
      } else {
        // cameraOperator.attachProjection(projections[activeProjection]);
        guiController.setValue(index);
      }
      guiController.updateDisplay();
    }
    // if (code === "Space") {
    //   // cameraOperator.fp();
    //   if (cameraOperator.projection) {
    //     cameraOperator.detachProjection();
    //   } else {
    //     cameraOperator.attachProjection(cameraOperator.projection, shiftKey);
    //   }
    // }
    if (code === "Enter" || code === "Space") {
      options.fpv = !options.fpv;
      guiControllerFPV.updateDisplay();
      cameraOperator.toggle();
    }

    if (code === "KeyX") {
      console.log(cameraOperator.camera.position);
      console.log(cameraOperator.camera.rotation);
    }

    if (code === "KeyC") {
      const currentRecords = records.map((r, i) => {
        const width = projections[i].camera.right - projections[i].camera.left;
        const height = projections[i].camera.top - projections[i].camera.bottom;
        return {
          ...r,
          camera: {
            position: [...projections[i].camera.position],
            rotation: [...projections[i].camera.rotation],
            fov: projections[i].camera.fov,
            ratio: projections[i].camera.aspect ?? height / width,
            far: projections[i].camera.far,
            size: width ?? undefined,
            orthographic: projections[i].camera.isOrthographicCamera,
          },
        };
      });

      await navigator.clipboard.writeText(
        JSON.stringify(currentRecords, null, 2),
      );
      console.log("copied to clipboard");
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

async function loadTexture(url) {
  const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
  if (isVideo) {
    const media = await new Promise((resolve) => {
      const el = document.createElement("video");
      el.src = url;
      el.crossOrigin = true;
      el.playsInline = true;
      el.muted = true;
      el.loop = true;
      el.play();
      el.addEventListener("playing", () => resolve(el), { once: true });
    });

    return new THREE.VideoTexture(media);
  } else {
    const loader = new THREE.TextureLoader();
    return await new Promise((resolve) =>
      loader.load(
        url,
        (texture) => resolve(texture),
        undefined,
        (err) => console.error(err),
      ),
    );
  }
}
