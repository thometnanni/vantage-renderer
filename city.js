// import { GLOBAL } from "./globals";
import * as THREE from "three";
import * as GEOLIB from "geolib";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
// import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";

const GLOBAL = {
  config: {
    citycenter: [13.4362366, 52.4813957],
  },
};

async function loadGeoJsonAsync() {
  return await fetch(GLOBAL.config.data).then((response) => {
    return response.json().then((data) => {
      return data.features;
    });
  });
}

function createGeometries(features) {
  const buildings = [];
  // const roads = []
  // const water = []
  // const green = []
  features.forEach((data) => {
    let coordinates = data.geometry.coordinates;
    let properties = data.properties;

    if (properties.building) {
      //if data is a building property (if it's a building)
      let building_levels = data.properties["building:levels"] || 1; //if building:levels property exists use it, otherwise use 1
      buildings.push(generateBuilding(coordinates, building_levels));
    }
    //  else if (properties.highway && data.geometry.type != "Point") {
    //   let road = generateRoad(coordinates, properties);
    //   if (road != undefined) {
    //     GLOBAL.roadArray.push(road);
    //   }
    // } else if (properties.natural) {
    //   GLOBAL.waterArray.push(generateWater(coordinates, properties));
    // } else if (properties.leisure) {
    //   //test green
    //   GLOBAL.greenArray.push(generateGreen(coordinates));
    // }
  });

  // const plane = new THREE.BoxGeometry(1, 1, 1);
  // // buildings.push(plane);
  // console.log(plane, buildings[0]);
  // plane.index = null;
  // buildings.push(plane);
  return { buildings: mergeGeometries(buildings) };
}

// GENERATE SHAPE AND FILL UP ARRAYS
function generateBuilding(coordinates, height = 1) {
  //each geojson "object" has multiple arrays of coordinates.
  //the first array is the main (outer) building shape
  //the second & third & .. are the "holes" in the building
  let buildingShape, buildingGeometry; //main building
  // let buildingHoles = []; //holes to punch out shape

  coordinates.forEach((points, index) => {
    //for each building do:
    if (index == 0) {
      //create main building shape
      buildingShape = generateShape(points);
    } else {
      //create shape of holes in building
      buildingShape.holes.push(generateShape(points));
      // buildingHoles.push(generateShape(points));
    }
  });

  buildingGeometry = generateGeometry(buildingShape, height);
  return buildingGeometry;
}

function generateRoad(coordinates, properties, height = 0) {
  // console.log(1);
  let points = [];

  //check if multi-point road, not a point.
  if (coordinates.length > 1) {
    coordinates.forEach((coordinates) => {
      let coords = normalizeCoordinates(coordinates, GLOBAL.config.citycenter);
      // points.push(new THREE.Vector3(coords[0], height, coords[1])); //old way
      points.push(coords[0], height, coords[1]);
    });

    // NEW WAY
    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3)
    );

    //OLD WAY
    // let geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.rotateZ(Math.PI);
    return geometry;
  } else {
    return undefined;
  }
}

function generateWater(coordinates, properties, height = 0.007) {
  //each geojson "object" has multiple arrays of coordinates.
  //the first array is the main (outer) building shape
  //the second & third & .. are the "holes" in the building
  let waterShape, waterGeometry; //main building
  // let buildingHoles = []; //holes to punch out shape

  coordinates.forEach((points, index) => {
    //for each building do:
    if (index == 0) {
      //create main building shape
      waterShape = generateShape(points);
    } else {
      //create shape of holes in building
      waterShape.holes.push(generateShape(points));
      // buildingHoles.push(generateShape(points));
    }
  });

  waterGeometry = generateGeometry(waterShape, height);
  return waterGeometry;
}

function generateGreen(coordinates, height = 0) {
  //each geojson "object" has multiple arrays of coordinates.
  //the first array is the main (outer) building shape
  //the second & third & .. are the "holes" in the building
  let greenShape, greenGeometry; //main building
  // let buildingHoles = []; //holes to punch out shape

  coordinates.forEach((points, index) => {
    //for each building do:
    if (index == 0) {
      //create main building shape
      greenShape = generateShape(points);
    } else {
      //create shape of holes in building
      greenShape.holes.push(generateShape(points));
      // buildingHoles.push(generateShape(points));
    }
  });

  greenGeometry = generateGeometry(greenShape, height);
  return greenGeometry;
}

function generateShape(polygon) {
  let shape = new THREE.Shape(); //only a single polygon?

  polygon.forEach((coordinates, index) => {
    let coords = normalizeCoordinates(coordinates, GLOBAL.config.citycenter);
    if (index == 0) {
      shape.moveTo(coords[0], coords[1]);
    } else {
      shape.lineTo(coords[0], coords[1]);
    }

    // console.log(coordinates);
    // shape.moveTo(coordinates[0], coordinates[1]);
  });

  return shape;
}

function generateGeometry(shape, height) {
  // let height = 1;
  let geometry = new THREE.ExtrudeGeometry(shape, {
    curveSegments: 1,
    depth: 0.05 * height,
    bevelEnabled: false,
  });

  geometry.rotateX(Math.PI / 2);
  geometry.rotateZ(Math.PI);
  return geometry;
  // // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  // const material = new THREE.MeshPhongMaterial({
  // 	color: GLOBAL.config.color_buildings,
  // });
  // const mesh = new THREE.Mesh(geometry, material);

  // mesh.updateMatrix();
  // // buildingGeometry.merge(mesh);

  // // console.log(mesh);
  // return mesh;
  // GLOBAL.scene.add(mesh);
}

//SPAWN GENERATED OBJECTS
function spawnBuildings() {
  let mergedGeometry = mergeGeometries(GLOBAL.buildingArray);

  const material = new THREE.MeshPhongMaterial({
    color: GLOBAL.config.color_buildings,
  });
  const mesh = new THREE.Mesh(mergedGeometry, material);
  mesh.name = "BUILDINGS";
  mesh.updateMatrix();
  // buildingGeometry.merge(mesh);
  mesh.layers.set(0);
  mesh.frustumCulled = false;
  // console.log(mesh);
  mesh.castShadow = true;
  GLOBAL.scene.add(mesh);
}

function spawnRoads() {
  GLOBAL.roadArray.forEach((road, index) => {
    let line = new THREE.Line(road, GLOBAL.material_road);
    line.name = "ROAD" + index;
    line.layers.set(1);
    line.frustumCulled = false;
    GLOBAL.scene.add(line);
  });

  // for (let index = 0; index < 50; index++) {
  // 	console.log(GLOBAL.roadArray[index]);
  // }
}

function spawnWater() {
  let mergedGeometry = mergeGeometries(GLOBAL.waterArray);

  const mesh = new THREE.Mesh(mergedGeometry, GLOBAL.material_water);
  mesh.name = "WATER";
  mesh.updateMatrix();

  mesh.position.y -= 0.01;
  mesh.layers.set(0);
  mesh.frustumCulled = false;
  GLOBAL.scene.add(mesh);
}

function spawnGreen() {
  let mergedGeometry = mergeGeometries(GLOBAL.greenArray);

  const mesh = new THREE.Mesh(mergedGeometry, GLOBAL.material_green);
  mesh.name = "GREEN";
  mesh.updateMatrix();

  mesh.position.y -= 0.01;
  mesh.layers.set(0);
  mesh.frustumCulled = false;
  GLOBAL.scene.add(mesh);
}

function spawnGround() {
  const geometry = new THREE.PlaneGeometry(50, 50);
  const material = new THREE.MeshBasicMaterial({
    color: 0xfafafa,
    side: THREE.DoubleSide,
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.receiveShadow = true;
  plane.rotation.x = Math.PI / 2;
  plane.position.y -= 0.03;
  // plane.position.y = 0;
  // plane.position.x = 0;
  GLOBAL.scene.add(plane);
}

//GENERAL FUNCTION
function normalizeCoordinates(objectPosition, centerPosition) {
  // Get GPS distance
  let dis = GEOLIB.getDistance(objectPosition, centerPosition);

  // Get bearing angle
  let bearing = GEOLIB.getRhumbLineBearing(objectPosition, centerPosition);

  // Calculate X by centerPosi.x + distance * cos(rad)
  let x = centerPosition[0] + dis * Math.cos((bearing * Math.PI) / 180);

  // Calculate Y by centerPosi.y + distance * sin(rad)
  let y = centerPosition[1] + dis * Math.sin((bearing * Math.PI) / 180);

  // Reverse X (it work)
  return [-x / 100, y / 100];
}

//main function
function generateCity(features) {
  // LOAD GEOJSON DATA
  // console.log(data);

  //generate shapes, meshes and lines
  const geometries = createGeometries(features);

  return geometries;
  // console.log(geometries.buildings);

  const material = new THREE.MeshPhongMaterial({
    color: 0xfafafa,
  });

  const meshes = {
    buildings: new THREE.Mesh(geometries.buildings, material),
  };

  meshes.buildings.name = "BUILDINGS";
  meshes.buildings.updateMatrix();
  // buildingGeometry.merge(mesh);
  meshes.buildings.layers.set(0);
  meshes.buildings.frustumCulled = false;
  // console.log(mesh);
  meshes.buildings.castShadow = true;

  // GLOBAL.scene.add(mesh);
  // spawnBuildings();
  // spawnRoads();
  // spawnWater();
  // spawnGreen();
  // spawnGround();
  return meshes;
}

export { generateCity };
