import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils";
import { rhumbDistance } from "@turf/rhumb-distance";
import { rhumbBearing } from "@turf/rhumb-bearing";
import { bboxClip } from "@turf/bbox-clip";

function generateBuildings(geo, center, bbox) {
  const buildings = geo.features
    .filter(({ properties }) => properties.building != null)
    .map((feature) => {
      const coordinates = (bbox ? bboxClip(feature.geometry, bbox) : feature)
        .geometry.coordinates;
      if (coordinates[0] == null) return;
      const shape = getShapeFromCoordinates(coordinates[0], center);
      shape.holes = coordinates
        .slice(1)
        .map((hole) => getShapeFromCoordinates(hole, center));

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
  return levels * 4;
}

function getShapeFromCoordinates(coordinates, center) {
  return new THREE.Shape(coordinates.map((c) => toMeters(c, center, true)));
}

function toMeters(point, reference, flipX) {
  const distance = rhumbDistance(point, reference) * 1000;
  const bearing = (rhumbBearing(point, reference) * Math.PI) / 180;

  let x = distance * Math.cos(bearing) * (flipX ? -1 : 1);
  let y = distance * Math.sin(bearing);

  return new THREE.Vector2(x, y);
}

export { generateBuildings, toMeters };
