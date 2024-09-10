import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils";
import { center } from "@turf/center";
import { rhumbDistance } from "@turf/rhumb-distance";
import { rhumbBearing } from "@turf/rhumb-bearing";

const GLOBAL = {
  config: {
    citycenter: [13.43296915, 52.48236605],
  },
};

function generateBuildings(geo) {
  const cityCenter = center(geo).geometry.coordinates;

  const buildings = geo.features
    .filter(({ properties }) => properties.building != null)
    .map((feature) => {
      const coordinates = feature.geometry.coordinates;
      const shape = getShapeFromCoordinates(coordinates[0]);
      shape.holes = coordinates
        .slice(1)
        .map((hole) => getShapeFromCoordinates(hole));

      let geometry = new THREE.ExtrudeGeometry(shape, {
        curveSegments: 1,
        depth: getBuildingHeight(feature.properties),
        bevelEnabled: false,
      });

      geometry.rotateX(Math.PI / 2);
      geometry.rotateZ(Math.PI);
      return geometry;
    });

  return mergeGeometries(buildings);
}

function getBuildingHeight(properties) {
  return (
    properties["building:height"] ??
    properties["height"] ??
    estimateBuildingHeight(properties["building:levels"])
  );
}

function estimateBuildingHeight(levels = 1) {
  return levels * 3;
}

function getShapeFromCoordinates(coordinates) {
  return new THREE.Shape(
    coordinates.map((c) => toMeters(c, GLOBAL.config.citycenter)),
  );
}

function toMeters(point, reference) {
  const distance = rhumbDistance(point, reference) * 1000;
  const bearing = (rhumbBearing(point, reference) * Math.PI) / 180;

  let x = -distance * Math.cos(bearing);
  let y = distance * Math.sin(bearing);

  return new THREE.Vector2(x, y);
}

export { generateBuildings };
