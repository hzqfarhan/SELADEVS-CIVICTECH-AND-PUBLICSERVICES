import * as THREE from "three";
import { MercatorCoordinate, type Map as LibreMap } from "maplibre-gl";

/** Decorative facade detail anchored to real OSM footprints, not surveyed windows. */
export function createBuildingDetails(
  origin: MercatorCoordinate,
  units: number,
) {
  const limit = 2400;
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: "#28434b",
    roughness: 0.7,
  });
  const paneMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const frames = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.85, 0.13, 2.05),
    frameMaterial,
    limit,
  );
  const panes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.35, 0.18, 1.5),
    paneMaterial,
    limit,
  );
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: "#c0cabc",
    roughness: 0.8,
  });
  const trims = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.35, 0.28),
    trimMaterial,
    600,
  );
  trims.count = 0;
  trims.frustumCulled = false;
  const group = new THREE.Group();
  group.add(frames, panes, trims);
  frames.count = panes.count = 0;
  frames.frustumCulled = panes.frustumCulled = false;
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  let refreshed = -Infinity;
  let previousLighting = "";
  return {
    group,
    update(map: LibreMap, now: number, lighting = "dusk") {
      if (lighting !== previousLighting) {
        refreshed = -Infinity;
        previousLighting = lighting;
      }
      group.visible = map.getZoom() >= 15.5;
      if (!group.visible || now - refreshed < 1400 || map.isMoving()) return;
      refreshed = now;
      const bounds = map.getBounds();
      const center = map.getCenter();
      const seen = new Set<string>();
      const buildings = map
        .querySourceFeatures("openmaptiles", { sourceLayer: "building" })
        .filter(
          (feature) =>
            feature.properties.hide_3d !== true &&
            feature.geometry.type === "Polygon",
        )
        .map((feature) => ({
          feature,
          ring:
            feature.geometry.type === "Polygon"
              ? feature.geometry.coordinates[0]
              : [],
        }))
        .filter(
          ({ ring }) =>
            ring.length > 3 && bounds.contains([ring[0][0], ring[0][1]]),
        )
        .sort(
          (a, b) =>
            Math.hypot(a.ring[0][0] - center.lng, a.ring[0][1] - center.lat) -
            Math.hypot(b.ring[0][0] - center.lng, b.ring[0][1] - center.lat),
        );
      let trimCount = 0;
      let count = 0,
        buildingCount = 0;
      for (const { feature, ring } of buildings) {
        const key = `${feature.id ?? ""}:${ring[0][0].toFixed(6)}:${ring[0][1].toFixed(6)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (++buildingCount > 80 || count >= limit) break;
        const height = Math.max(
          3,
          Number(feature.properties.render_height ?? 6),
        );
        const base = Math.max(
          0,
          Number(feature.properties.render_min_height ?? 0),
        );
        if (!Number.isFinite(height) || !Number.isFinite(base)) continue;
        const buildingSeed = Math.abs(
          Math.round(ring[0][0] * 100000) + Math.round(ring[0][1] * 100000),
        );
        const points = ring.map((p) => {
          const point = MercatorCoordinate.fromLngLat([p[0], p[1]]);
          return [(point.x - origin.x) / units, -(point.y - origin.y) / units];
        });
        const area = points.reduce((sum, p, i) => {
          const q = points[(i + 1) % points.length];
          return sum + p[0] * q[1] - q[0] * p[1];
        }, 0);
        for (let edge = 0; edge < points.length - 1 && count < limit; edge++) {
          const a = points[edge],
            b = points[edge + 1];
          const dx = b[0] - a[0],
            dy = b[1] - a[1],
            length = Math.hypot(dx, dy);
          if (length < 4 || length > 350) continue;
          const normal = area > 0 ? -1 : 1;
          if (trimCount < 600) {
            transform.position.set(
              (a[0] + b[0]) / 2,
              (a[1] + b[1]) / 2,
              height + 0.12,
            );
            transform.rotation.set(0, 0, Math.atan2(dy, dx));
            transform.scale.set(length, 1, 1);
            transform.updateMatrix();
            trims.setMatrixAt(trimCount++, transform.matrix);
            transform.scale.set(1, 1, 1);
          }
          for (
            let z = base + 2.7;
            z < Math.min(height - 1, base + 90) && count < limit;
            z += 3.5
          ) {
            for (let d = 2.2; d < length - 1.5 && count < limit; d += 4) {
              transform.position.set(
                a[0] + (dx * d) / length - (dy / length) * 0.18 * normal,
                a[1] + (dy * d) / length + (dx / length) * 0.18 * normal,
                z,
              );
              transform.rotation.set(0, 0, Math.atan2(dy, dx));
              transform.updateMatrix();
              frames.setMatrixAt(count, transform.matrix);
              panes.setMatrixAt(count, transform.matrix);
              // Deterministic lit/dark variation; does not claim actual occupancy.
              color.set(
                lighting !== "day" &&
                  (edge + Math.floor(d) + Math.floor(z) + buildingSeed) % 5 <
                    (lighting === "night" ? 3 : 2)
                  ? "#f4cf8c"
                  : "#365b70",
              );
              panes.setColorAt(count, color);
              count++;
            }
          }
        }
      }
      trims.count = trimCount;
      trims.instanceMatrix.needsUpdate = true;
      frames.count = panes.count = count;
      frames.instanceMatrix.needsUpdate =
        panes.instanceMatrix.needsUpdate = true;
      if (panes.instanceColor) panes.instanceColor.needsUpdate = true;
    },
    dispose() {
      trims.geometry.dispose();
      trimMaterial.dispose();
      trims.dispose();
      frames.geometry.dispose();
      panes.geometry.dispose();
      frameMaterial.dispose();
      paneMaterial.dispose();
      frames.dispose();
      panes.dispose();
    },
  };
}
