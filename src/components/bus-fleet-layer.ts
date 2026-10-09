import * as THREE from "three";
import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map as LibreMap,
} from "maplibre-gl";
import type { TransportMapProps } from "./map-types";
import { sampleMotion, type VehicleMotion } from "./map-motion";

import { createBuildingDetails } from "./building-details";
import { buildBus, wheelTurn } from "./bus-model";

export function createBusFleetLayer(
  getProps: () => TransportMapProps,
  motions: Map<string, VehicleMotion>,
): CustomLayerInterface {
  let map: LibreMap, renderer: THREE.WebGLRenderer;
  const scene = new THREE.Scene(),
    camera = new THREE.Camera();
  const models = new Map<
    string,
    {
      bus: ReturnType<typeof buildBus>;
      coordinate?: [number, number];
      color: string;
      travel: number;
    }
  >();
  // Shared geometry and instancing: illustrative stop lamps, no per-lamp lights.
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: "#304b53",
    roughness: 0.45,
    metalness: 0.6,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: "#ffe2a0" });
  const poolMaterial = new THREE.MeshBasicMaterial({
    color: "#ffc66b",
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const poles = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.2, 7, 6).rotateX(Math.PI / 2),
    lampMaterial,
    40,
  );
  const lamps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.4, 0.6, 0.16),
    glowMaterial,
    40,
  );
  const pools = new THREE.InstancedMesh(
    new THREE.CircleGeometry(5, 20),
    poolMaterial,
    40,
  );
  const lampParts = [poles, lamps, pools];
  for (const part of lampParts) {
    part.count = 0;
    part.frustumCulled = false;
    scene.add(part);
  }
  const matrix = new THREE.Matrix4();
  const origin = MercatorCoordinate.fromLngLat([103.75, 1.5]);
  const units = origin.meterInMercatorCoordinateUnits();

  const buildings = createBuildingDetails(origin, units);
  scene.add(buildings.group);
  const focusScene = new THREE.Scene();
  const focusAmbient = new THREE.AmbientLight("#e7f0ff", 2);
  const focusSun = new THREE.DirectionalLight("#fff3d1", 2.5);
  focusSun.position.set(-50, 30, 100);
  focusScene.add(focusAmbient, focusSun);
  let lastFrame = 0;
  let lastLampUpdate = -Infinity;
  const ambient = new THREE.AmbientLight("#b3d6ef", 1.4);
  const sun = new THREE.DirectionalLight("#ffdaa3", 2.8);
  const reducedMotion =
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    id: "gerak-bus-fleet",
    type: "custom",
    renderingMode: "3d",
    onAdd(instance, gl) {
      map = instance;
      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl as WebGL2RenderingContext,
        antialias: true,
      });
      renderer.autoClear = false;
      scene.add(ambient);
      sun.position.set(-50, 30, 100);
      scene.add(sun);
    },
    render(_gl, args) {
      const props = getProps();
      if (props.mode !== "3d" || map.getZoom() < 11.5) return;
      const now = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (now - lastFrame) / 1000));
      lastFrame = now;
      const lighting = props.lighting ?? "dusk";
      ambient.intensity =
        lighting === "day" ? 2 : lighting === "night" ? 0.65 : 1.4;
      sun.intensity = lighting === "day" ? 3 : lighting === "night" ? 0.7 : 2.8;
      if (props.weatherCode !== undefined && props.weatherCode >= 3)
        sun.intensity *= props.weatherCode >= 51 ? 0.6 : 0.8;
      sun.color.set(
        lighting === "day"
          ? "#fff9e9"
          : lighting === "night"
            ? "#a9c9ff"
            : "#ffdaa3",
      );
      poolMaterial.opacity =
        lighting === "day" ? 0.025 : lighting === "night" ? 0.2 : 0.11;
      buildings.update(map, now, lighting);
      if (props.follow) buildings.group.visible = false;

      const active = new Set(props.vehicles.map((v) => v.id));
      for (const [id, model] of models)
        if (!active.has(id)) {
          scene.remove(model.bus.root);
          model.bus.dispose();
          models.delete(id);
        }
      const bounds = map.getBounds();
      if (now - lastLampUpdate > 800) {
        lastLampUpdate = now;
        const litStops =
          map.getZoom() >= 15
            ? props.stops
                .filter((stop) => bounds.contains(stop.coordinate))
                .slice(0, 40)
            : [];
        for (const part of lampParts) part.count = litStops.length;
        litStops.forEach((stop, index) => {
          const point = MercatorCoordinate.fromLngLat(stop.coordinate);
          const x = (point.x - origin.x) / units + 3;
          const y = -(point.y - origin.y) / units;
          poles.setMatrixAt(index, matrix.makeTranslation(x, y, 3.5));
          lamps.setMatrixAt(index, matrix.makeTranslation(x + 0.5, y, 7));
          pools.setMatrixAt(index, matrix.makeTranslation(x + 0.5, y, 0.15));
        });
        for (const part of lampParts) part.instanceMatrix.needsUpdate = true;
      }
      for (const vehicle of props.vehicles) {
        const motion = motions.get(vehicle.id);
        const sample = motion ? sampleMotion(motion, now) : vehicle;
        const color =
          props.routes.find((r) => r.id === vehicle.routeId)?.color ??
          "#518bee";
        let model = models.get(vehicle.id);
        if (model && model.color !== color) {
          scene.remove(model.bus.root);
          model.bus.dispose();
          models.delete(vehicle.id);
          model = undefined;
        }
        if (!model) {
          const variant = [...vehicle.id].reduce(
            (sum, char) => sum + char.charCodeAt(0),
            0,
          );
          model = {
            bus: buildBus(
              color,
              variant,
              vehicle.vehicleKind,
              props.routes.find((r) => r.id === vehicle.routeId)?.operator,
            ),
            color,
            travel: 0,
          };
          models.set(vehicle.id, model);
          scene.add(model.bus.root);
        }
        model.bus.selection.visible =
          props.selectedVehicleId === vehicle.id ||
          props.previewVehicleId === vehicle.id;
        const pulse = reducedMotion ? 1 : 1 + Math.sin(now * 0.003) * 0.045;
        model.bus.selection.scale.set(pulse, pulse * 3, 1);
        model.bus.root.visible = bounds.contains(sample.coordinate);
        if (!model.bus.root.visible) {
          model.coordinate = undefined;
          continue;
        }
        const position = MercatorCoordinate.fromLngLat(sample.coordinate);
        model.bus.root.position.set(
          (position.x - origin.x) / units,
          -(position.y - origin.y) / units,
          0.5,
        );
        const targetHeading = (-sample.bearing * Math.PI) / 180;
        const turn = Math.atan2(
          Math.sin(targetHeading - model.bus.root.rotation.z),
          Math.cos(targetHeading - model.bus.root.rotation.z),
        );
        if (!model.coordinate) {
          model.bus.root.rotation.z = targetHeading;
        } else {
          model.bus.root.rotation.z += turn * (1 - Math.exp(-dt * 8));
        }
        const scale = Math.min(12, Math.max(2.4, 2 ** (16.5 - map.getZoom())));
        model.bus.root.scale.set(
          scale,
          scale * (vehicle.vehicleKind === "rail" ? 1.6 : 1),
          scale,
        );
        if (model.coordinate) {
          const dx =
            (sample.coordinate[0] - model.coordinate[0]) *
            111320 *
            Math.cos((sample.coordinate[1] * Math.PI) / 180);
          const dy = (sample.coordinate[1] - model.coordinate[1]) * 111320;
          const distance = Math.hypot(dx, dy);
          const moving = distance / dt > 0.15 && distance < 200;
          // Suspension and wheel rotation follow actual displayed travel. A
          // correction/teleport must not spin the tyres or kick the body.
          const continuous = distance < Math.max(3, dt * 65);
          if (continuous) model.travel += distance / scale;
          const damping = 1 - Math.exp(-dt * 10);
          const bounce =
            !reducedMotion && moving && continuous
              ? Math.sin(model.travel * 1.4) * 0.014
              : 0;
          const lean =
            !reducedMotion && moving && continuous
              ? Math.max(-0.018, Math.min(0.018, turn * 0.08))
              : 0;
          model.bus.body.position.z +=
            (bounce - model.bus.body.position.z) * damping;
          model.bus.body.rotation.y +=
            (lean - model.bus.body.rotation.y) * damping;
          if (continuous && !reducedMotion)
            for (const wheel of model.bus.wheels)
              wheel.rotation.x -= wheelTurn(distance / scale);
        }
        model.coordinate = [...sample.coordinate];
      }
      camera.projectionMatrix
        .fromArray(args.defaultProjectionData.mainMatrix)
        .multiply(
          new THREE.Matrix4()
            .makeTranslation(origin.x, origin.y, origin.z)
            .scale(new THREE.Vector3(units, -units, units)),
        );
      renderer.resetState();
      renderer.render(scene, camera);
      // Focus overlay keeps the selected ride legible through softened buildings.
      const focused =
        props.follow && props.selectedVehicleId
          ? models.get(props.selectedVehicleId)?.bus.root
          : props.previewVehicleId
            ? models.get(props.previewVehicleId)?.bus.root
            : undefined;
      if (focused?.visible) {
        focusAmbient.intensity = ambient.intensity;
        focusSun.intensity = sun.intensity;
        focusSun.color.copy(sun.color);
        focusScene.add(focused);
        renderer.clearDepth();
        renderer.render(focusScene, camera);
        scene.add(focused);
      }
      renderer.resetState();
      map.triggerRepaint();
    },
    onRemove() {
      for (const model of models.values()) model.bus.dispose();
      models.clear();
      for (const part of lampParts) {
        part.geometry.dispose();
        part.dispose();
      }
      buildings.dispose();
      lampMaterial.dispose();
      glowMaterial.dispose();
      poolMaterial.dispose();
      renderer?.dispose();
    },
  };
}
