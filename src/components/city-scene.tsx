"use client";

import {
  Component,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Coordinate, TransitRoute, Vehicle } from "@/lib/types";
import type { TransportMapProps } from "./map-types";
import {
  createProjection,
  sampleMotion,
  updateMotions,
  type VehicleMotion,
} from "./map-motion";

type Projection = ReturnType<typeof createProjection>;
type Instance = {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  rotation?: number;
};

class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <>
        {this.props.fallback}
        <div className="gerak-city-fallback-note">
          3D unavailable on this device · showing the 2D map
        </div>
      </>
    ) : (
      this.props.children
    );
  }
}

function randomGenerator(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
}
function segmentDistance(
  x: number,
  z: number,
  a: [number, number],
  b: [number, number],
) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const t = Math.min(
    1,
    Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)),
  );
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}

/** Buildings, roofs and trees each share geometry/material through instancing. */
function InstanceBatch({
  instances,
  shape = "box",
  roughness = 0.86,
  castShadow = true,
}: {
  instances: Instance[];
  shape?: "box" | "tree" | "trunk";
  roughness?: number;
  castShadow?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new THREE.Object3D();
    instances.forEach((item, index) => {
      object.position.set(...item.position);
      object.scale.set(...item.scale);
      object.rotation.set(0, item.rotation ?? 0, 0);
      object.updateMatrix();
      mesh.current!.setMatrixAt(index, object.matrix);
      mesh.current!.setColorAt(index, new THREE.Color(item.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [instances]);
  if (!instances.length) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, instances.length]}
      castShadow={castShadow}
      receiveShadow
    >
      {shape === "tree" ? (
        <icosahedronGeometry args={[1, 0]} />
      ) : shape === "trunk" ? (
        <cylinderGeometry args={[0.12, 0.16, 1, 5]} />
      ) : (
        <boxGeometry args={[1, 1, 1]} />
      )}
      <meshStandardMaterial roughness={roughness} />
    </instancedMesh>
  );
}

function CityBlocks({
  projection,
  routes,
  region,
}: {
  projection: Projection;
  routes: TransitRoute[];
  region: string;
}) {
  const city = useMemo(() => {
    const isCampus = region === "uthm" || region === "uthm-pagoh";
    const random = randomGenerator(isCampus ? 606 : 2026);
    const paths = routes.map((route) => route.path.map(projection.project));
    const awayFromRoad = (x: number, z: number, margin: number) =>
      paths.every((path) =>
        path
          .slice(1)
          .every((point, i) => segmentDistance(x, z, path[i], point) > margin),
      );
    const buildings: Instance[] = [],
      roofs: Instance[] = [],
      windows: Instance[] = [],
      trees: Instance[] = [],
      trunks: Instance[] = [],
      streets: Instance[] = [],
      parks: Instance[] = [];
    const palette = ["#e6eddb", "#c5dfd7", "#a8d2cf", "#d5e5c6", "#b7cec0"];
    const grid = 22;
    for (
      let x = -projection.width / 2 + 6;
      x < projection.width / 2 - 5;
      x += grid
    )
      streets.push({
        position: [x, 0.035, 0],
        scale: [0.56, 0.05, projection.depth - 4],
        color: "#609890",
      });
    for (
      let z = -projection.depth / 2 + 6;
      z < projection.depth / 2 - 5;
      z += grid
    )
      streets.push({
        position: [0, 0.04, z],
        scale: [projection.width - 4, 0.05, 0.56],
        color: "#609890",
      });
    for (let i = 0; i < 500 && buildings.length < (isCampus ? 45 : 80); i++) {
      const x = (random() - 0.5) * (projection.width - 9),
        z = (random() - 0.5) * (projection.depth - 9);
      const w = 1.4 + random() * 2.7,
        d = 1.5 + random() * 2.7;
      if (!awayFromRoad(x, z, Math.max(w, d) / 2 + 3.5)) continue;
      if (
        buildings.some(
          (building) =>
            Math.abs(x - building.position[0]) <
              (w + building.scale[0]) / 2 + 0.6 &&
            Math.abs(z - building.position[2]) <
              (d + building.scale[2]) / 2 + 0.6,
        )
      )
        continue;
      const tall = region === "johor" && random() > 0.94;
      const h = tall
        ? 4.5 + random() * 3
        : 1.5 + random() * (isCampus ? 2.8 : 3.6);
      const color = palette[Math.floor(random() * palette.length)];
      buildings.push({
        position: [x, h / 2 + 0.13, z],
        scale: [w, h, d],
        color,
      });
      roofs.push({
        position: [x, h + 0.22, z],
        scale: [w + 0.09, 0.16, d + 0.09],
        color: tall ? "#719e98" : "#dae9d4",
      });
      if (h > 3)
        roofs.push({
          position: [x + w * 0.12, h + 0.47, z],
          scale: [w * 0.52, 0.4, d * 0.5],
          color: "#83aca5",
        });
      const floors = Math.min(6, Math.floor(h / 1.5));
      for (let floor = 0; floor < floors; floor++) {
        windows.push({
          position: [x, 1.3 + floor * 1.45, z + d / 2 + 0.02],
          scale: [w * 0.72, 0.37, 0.03],
          color: "#5c9594",
        });
        windows.push({
          position: [x + w / 2 + 0.02, 1.3 + floor * 1.45, z],
          scale: [0.03, 0.37, d * 0.72],
          color: "#77a9a1",
        });
      }
    }
    for (let i = 0; i < 320 && trees.length < 65; i++) {
      const x = (random() - 0.5) * (projection.width - 6),
        z = (random() - 0.5) * (projection.depth - 6);
      if (
        !awayFromRoad(x, z, 1.2) ||
        buildings.some(
          (building) =>
            Math.abs(x - building.position[0]) < building.scale[0] / 2 + 0.9 &&
            Math.abs(z - building.position[2]) < building.scale[2] / 2 + 0.9,
        )
      )
        continue;
      const size = 0.65 + random() * 0.5;
      trunks.push({
        position: [x, 0.72, z],
        scale: [1, 1.25, 1],
        color: "#53796b",
      });
      trees.push({
        position: [x, 1.48 + size * 0.3, z],
        scale: [size, size * 1.25, size],
        color: ["#397f6d", "#4a9576", "#72ab82", "#8db88a"][
          Math.floor(random() * 4)
        ],
      });
    }
    for (let i = 0; i < 12; i++) {
      const x = (random() - 0.5) * (projection.width - 10),
        z = (random() - 0.5) * (projection.depth - 10);
      if (awayFromRoad(x, z, 4))
        parks.push({
          position: [x, 0.045, z],
          scale: [3 + random() * 4, 0.06, 3 + random() * 4],
          color: "#7aae87",
        });
    }
    return { buildings, roofs, windows, trees, trunks, streets, parks };
  }, [projection, routes, region]);
  return (
    <group>
      <InstanceBatch instances={city.streets} castShadow={false} />
      <InstanceBatch instances={city.parks} castShadow={false} />
      <InstanceBatch instances={city.buildings} />
      <InstanceBatch instances={city.roofs} />
      <InstanceBatch instances={city.windows} castShadow={false} />
      <InstanceBatch instances={city.trees} shape="tree" />
      <InstanceBatch instances={city.trunks} shape="trunk" />
    </group>
  );
}

function Roads({
  routes,
  projection,
}: {
  routes: TransitRoute[];
  projection: Projection;
}) {
  const { roads, curbs } = useMemo(() => {
    const roads: Instance[] = [],
      curbs: Instance[] = [];
    for (const route of routes) {
      const points = route.path.map(projection.project);
      points.slice(1).forEach((point, i) => {
        const a = points[i],
          length = Math.hypot(point[0] - a[0], point[1] - a[1]);
        const rotation = Math.atan2(point[0] - a[0], point[1] - a[1]);
        roads.push({
          position: [(point[0] + a[0]) / 2, 0.135, (point[1] + a[1]) / 2],
          scale: [1.8, 0.08, length + 0.75],
          rotation,
          color: "#416e6b",
        });
        curbs.push({
          position: [(point[0] + a[0]) / 2, 0.075, (point[1] + a[1]) / 2],
          scale: [2.45, 0.08, length + 1],
          rotation,
          color: "#a5c8b8",
        });
      });
    }
    return { roads, curbs };
  }, [routes, projection]);
  return (
    <group>
      <InstanceBatch instances={curbs} castShadow={false} />
      <InstanceBatch instances={roads} castShadow={false} />
      {routes.map((route, i) => (
        <Line
          key={route.id}
          points={route.path.map((coordinate) => {
            const [x, z] = projection.project(coordinate);
            return [x, 0.195 + i * 0.012, z] as [number, number, number];
          })}
          color={route.color}
          lineWidth={2.1}
          transparent
          opacity={0.95}
        />
      ))}
    </group>
  );
}

function VehicleModel({
  vehicle,
  color,
  selected,
  showLabel,
  onHover,
  projection,
  motions,
  onSelect,
}: {
  vehicle: Vehicle;
  color: string;
  selected: boolean;
  showLabel: boolean;
  onHover: (id: string | null) => void;
  projection: Projection;
  motions: RefObject<Map<string, VehicleMotion>>;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const initial = projection.project(vehicle.coordinate);
  useFrame((state, delta) => {
    const motion = motions.current.get(vehicle.id);
    if (!motion || !group.current) return;
    const sample = sampleMotion(motion, performance.now());
    const [x, z] = projection.project(sample.coordinate);
    group.current.position.set(x, 0.32, z);
    const target = (-sample.bearing * Math.PI) / 180;
    const difference = Math.atan2(
      Math.sin(target - group.current.rotation.y),
      Math.cos(target - group.current.rotation.y),
    );
    group.current.rotation.y += difference * (1 - Math.exp(-delta * 13));
    if (halo.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.4) * 0.08;
      halo.current.scale.set(pulse, pulse, 1);
    }
  });
  const choose = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(vehicle.id);
  };
  return (
    <group
      ref={group}
      position={[initial[0], 0.44, initial[1]]}
      rotation={[0, (-vehicle.bearing * Math.PI) / 180, 0]}
      onClick={choose}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(vehicle.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      {selected && (
        <mesh
          ref={halo}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.12, 0]}
        >
          <ringGeometry args={[2.2, 2.6, 40]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[1.55, 0.9, 3.55]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.25, -0.02]} castShadow>
        <boxGeometry args={[1.45, 0.52, 3.1]} />
        <meshStandardMaterial color="#d4e8da" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.08, -1.8]}>
        <boxGeometry args={[1.25, 0.65, 0.06]} />
        <meshStandardMaterial
          color="#163c3e"
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0, 1.25, 0.04]}>
        <boxGeometry args={[1.48, 0.34, 2.45]} />
        <meshStandardMaterial color="#1e4747" roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.55, 0.15]}>
        <boxGeometry args={[1.0, 0.18, 1.8]} />
        <meshStandardMaterial color="#eef7de" />
      </mesh>
      <mesh position={[0, 0.56, -1.82]}>
        <boxGeometry args={[1.25, 0.2, 0.06]} />
        <meshStandardMaterial
          color="#fff6b5"
          emissive="#ffef99"
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh position={[0, 0.56, 1.8]}>
        <boxGeometry args={[1.15, 0.16, 0.06]} />
        <meshStandardMaterial
          color="#e65a48"
          emissive="#cc3b28"
          emissiveIntensity={0.4}
        />
      </mesh>
      {[-0.82, 0.82].flatMap((x) =>
        [-1.15, 1.15].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[x, 0.3, z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.35, 0.35, 0.18, 12]} />
            <meshStandardMaterial color="#182e2c" roughness={0.9} />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.85, 0]} visible={false}>
        <boxGeometry args={[3.2, 3.5, 5.0]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

// Fit the expanded geography to the actual viewport, including portrait phones.
function fitCityCamera(
  camera: THREE.PerspectiveCamera,
  projection: Projection,
) {
  const radius = Math.hypot(projection.width, projection.depth) / 2;
  const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const distance = Math.min(
    1700,
    (radius / Math.sin(Math.min(vertical, horizontal))) * 1.08,
  );
  camera.position.copy(
    new THREE.Vector3(0.65, 1, 1.15).normalize().multiplyScalar(distance),
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function CityFraming({
  projection,
  controlsRef,
}: {
  projection: Projection;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, size } = useThree();
  useEffect(() => {
    fitCityCamera(camera as THREE.PerspectiveCamera, projection);
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
  }, [camera, size.width, size.height, projection, controlsRef]);
  return null;
}

function CameraRig({
  follow,
  selectedVehicleId,
  motions,
  projection,
  controlsRef,
}: {
  follow: boolean;
  selectedVehicleId: string | null;
  motions: RefObject<Map<string, VehicleMotion>>;
  projection: Projection;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const offset = useRef(new THREE.Vector3(17, 23, 26));
  const wasFollowing = useRef(false);
  const desiredTarget = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (!follow || !selectedVehicleId) {
      wasFollowing.current = false;
      return;
    }
    const motion = motions.current.get(selectedVehicleId);
    if (!motion) return;
    const [x, z] = projection.project(
      sampleMotion(motion, performance.now()).coordinate,
    );
    if (!wasFollowing.current) {
      offset.current
        .copy(camera.position)
        .sub(controls.target)
        .normalize()
        .multiplyScalar(36);
      wasFollowing.current = true;
    }
    desiredTarget.current.set(x, 0.9, z);
    const damping = 1 - Math.exp(-Math.min(delta, 0.1) * 3);
    controls.target.lerp(desiredTarget.current, damping);
    camera.position.lerp(
      desiredTarget.current.clone().add(offset.current),
      damping,
    );
    controls.update();
  });
  return null;
}

function Ground({
  projection,
  picking,
  onPick,
}: {
  projection: Projection;
  picking?: boolean;
  onPick?: (coordinate: Coordinate) => void;
}) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.55, 0]}
        receiveShadow
      >
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color="#235e62" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.74, 0]} receiveShadow castShadow>
        <boxGeometry
          args={[projection.width + 0.6, 1.5, projection.depth + 0.6]}
        />
        <meshStandardMaterial color="#406f64" roughness={1} />
      </mesh>
      <mesh
        position={[0, -0.07, 0]}
        receiveShadow
        onClick={(event) => {
          if (picking && onPick) {
            event.stopPropagation();
            onPick(projection.unproject([event.point.x, event.point.z]));
          }
        }}
      >
        <boxGeometry args={[projection.width, 0.18, projection.depth]} />
        <meshStandardMaterial color="#82b5a2" roughness={1} />
      </mesh>
      <mesh position={[0, -0.03, projection.depth / 2 - 0.65]} receiveShadow>
        <boxGeometry args={[projection.width - 1, 0.18, 1.15]} />
        <meshStandardMaterial color="#c9d6b4" />
      </mesh>
      <mesh position={[0, -0.03, projection.depth / 2 - 2]}>
        <boxGeometry args={[projection.width - 1, 0.18, 1.2]} />
        <meshStandardMaterial color="#689780" />
      </mesh>
    </group>
  );
}

function ContextLossWatcher({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, onLost]);
  return null;
}

function World({
  props,
  projection,
  controlsRef,
  onLost,
}: {
  props: TransportMapProps;
  projection: Projection;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  onLost: () => void;
}) {
  const motions = useRef(new Map<string, VehicleMotion>());
  useEffect(() => {
    updateMotions(
      motions.current,
      props.vehicles,
      props.routes,
      performance.now(),
    );
  }, [props.vehicles, props.routes]);
  const [picked, setPicked] = useState<Coordinate | null>(null);
  const [hoveredVehicle, setHoveredVehicle] = useState<string | null>(null);
  const [hoveredStop, setHoveredStop] = useState<string | null>(null);
  // Exactly one vehicle label; selection takes priority over pointer hover.
  const labelledVehicle = props.selectedVehicleId ?? hoveredVehicle;
  const pick = (coordinate: Coordinate) => {
    setPicked(coordinate);
    props.onPick?.(coordinate);
  };
  const nearReports = props.reports.filter((report) => {
    const [x, z] = projection.project(report.coordinate);
    return (
      Math.abs(x) < projection.width / 2 &&
      Math.abs(z) < projection.depth / 2 &&
      report.status !== "resolved"
    );
  });
  return (
    <>
      <color attach="background" args={["#235e62"]} />
      <fog attach="fog" args={["#235e62", 900, 1900]} />
      <ambientLight intensity={1.15} color="#cdece0" />
      <hemisphereLight args={["#ddf8ed", "#52796f", 1.1]} />
      <directionalLight
        position={[-100, 220, 120]}
        intensity={2.4}
        color="#fff8db"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
        shadow-camera-far={650}
        shadow-bias={-0.001}
        shadow-normalBias={0.15}
      />
      <Ground projection={projection} picking={props.picking} onPick={pick} />
      <CityBlocks
        projection={projection}
        routes={props.routes}
        region={props.region}
      />
      <Roads projection={projection} routes={props.routes} />
      {props.stops.map((stop) => {
        const [x, z] = projection.project(stop.coordinate);
        return (
          <group
            key={stop.id}
            position={[x, 0.25, z]}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoveredStop(stop.id);
            }}
            onPointerOut={() => setHoveredStop(null)}
            onClick={(event) => {
              event.stopPropagation();
              props.onSelectStop?.(stop.id);
            }}
          >
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.54, 16]} />
              <meshBasicMaterial color="#e7f6ce" />
            </mesh>
            <mesh position={[0.85, 0.66, 0]} castShadow>
              <boxGeometry args={[0.06, 1.25, 0.06]} />
              <meshStandardMaterial color="#e2efde" />
            </mesh>
            <mesh position={[0.85, 1.3, 0]}>
              <boxGeometry args={[0.65, 0.4, 0.12]} />
              <meshStandardMaterial color="#294e45" />
            </mesh>
            {!labelledVehicle && hoveredStop === stop.id && (
              <Html position={[0, 2.2, 0]} center zIndexRange={[5, 0]}>
                <button
                  className="gerak-city-stop-label"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onSelectStop?.(stop.id);
                  }}
                >
                  {stop.name}
                </button>
              </Html>
            )}
          </group>
        );
      })}
      {props.vehicles.map((vehicle) => (
        <VehicleModel
          key={vehicle.id}
          vehicle={vehicle}
          color={
            props.routes.find((route) => route.id === vehicle.routeId)?.color ??
            "#b3f56b"
          }
          selected={vehicle.id === props.selectedVehicleId}
          showLabel={vehicle.id === labelledVehicle}
          onHover={setHoveredVehicle}
          projection={projection}
          motions={motions}
          onSelect={props.onSelectVehicle}
        />
      ))}
      {nearReports.map((report) => {
        const [x, z] = projection.project(report.coordinate);
        return (
          <group key={report.id} position={[x, 0.21, z]}>
            {props.heatmap && (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[4, 28]} />
                <meshBasicMaterial
                  color="#ffb354"
                  transparent
                  opacity={0.3}
                  depthWrite={false}
                />
              </mesh>
            )}
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.8, 6]} />
              <meshStandardMaterial color="#d79f48" />
            </mesh>
            <Html position={[0, 2.2, 0]} center zIndexRange={[8, 0]}>
              <span
                className="gerak-city-report-label"
                title={`${report.title} · ${report.status}`}
              >
                !
              </span>
            </Html>
          </group>
        );
      })}
      {picked && (
        <mesh
          position={[
            projection.project(picked)[0],
            0.28,
            projection.project(picked)[1],
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.6, 1.15, 32]} />
          <meshBasicMaterial color="#ffd387" side={THREE.DoubleSide} />
        </mesh>
      )}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={15}
        maxDistance={1800}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.25}
        enablePan={!props.follow}
        enableRotate={!props.follow}
        enableZoom={!props.follow}
        target={[0, 0, 0]}
      />
      <CityFraming projection={projection} controlsRef={controlsRef} />
      <CameraRig
        follow={props.follow}
        selectedVehicleId={props.selectedVehicleId}
        motions={motions}
        projection={projection}
        controlsRef={controlsRef}
      />
      <ContextLossWatcher onLost={onLost} />
    </>
  );
}

export default function CityScene(
  props: TransportMapProps & { fallback: ReactNode },
) {
  const projection = useMemo(
    () => createProjection(props.routes, props.region, 260),
    [props.routes, props.region],
  );
  const controls = useRef<OrbitControlsImpl>(null);
  const [lost, setLost] = useState(false);
  const handleLost = useMemo(() => () => setLost(true), []);
  const zoom = (factor: number) => {
    if (!controls.current) return;
    const control = controls.current;
    const offset = control.object.position
      .clone()
      .sub(control.target)
      .multiplyScalar(factor);
    control.object.position.copy(control.target).add(offset);
    control.update();
  };
  const reset = () => {
    if (!controls.current) return;
    controls.current.target.set(0, 0, 0);
    fitCityCamera(
      controls.current.object as THREE.PerspectiveCamera,
      projection,
    );
    controls.current.update();
  };
  if (lost)
    return (
      <>
        {props.fallback}
        <div className="gerak-city-fallback-note">
          3D context lost · showing the 2D map
        </div>
      </>
    );
  return (
    <SceneErrorBoundary fallback={props.fallback}>
      <div
        className={`gerak-city-scene ${props.picking ? "gerak-city-picking" : ""}`}
        data-testid="map-3d"
      >
        <Canvas
          key={props.region}
          shadows="basic"
          dpr={[1, 1.5]}
          camera={{ position: [160, 220, 260], fov: 42, near: 0.5, far: 2400 }}
          gl={{ antialias: true, alpha: false, powerPreference: "default" }}
          fallback={
            <>
              {props.fallback}
              <div className="gerak-city-fallback-note">
                WebGL unavailable · showing the 2D map
              </div>
            </>
          }
          onCreated={({ gl }) => {
            gl.setClearColor("#235e62");
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.15;
          }}
        >
          <Suspense fallback={null}>
            <World
              props={props}
              projection={projection}
              controlsRef={controls}
              onLost={handleLost}
            />
          </Suspense>
        </Canvas>
        <div className="gerak-city-north" aria-hidden="true">
          <span>N</span>
          <svg viewBox="0 0 20 25">
            <path d="M10 0 18 23 10 17 2 23Z" fill="#d4e6d4" />
            <path d="M10 0 10 17 2 23Z" fill="#679489" />
          </svg>
        </div>
        <div className="gerak-map-navigation" aria-label="3D map controls">
          <button
            type="button"
            aria-label="Zoom in 3D"
            onClick={() => zoom(0.8)}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out 3D"
            onClick={() => zoom(1.25)}
          >
            −
          </button>
          <span />
          <button type="button" aria-label="Reset 3D camera" onClick={reset}>
            ⌖
          </button>
        </div>
        <div className="gerak-city-mode-note">
          <strong>
            A little {props.region === "johor" ? "Johor Bahru" : "UTHM"}. Always
            moving.
          </strong>
          Stylized buildings & terrain ·{" "}
          {props.vehicles.some((v) => v.source === "gtfs-rt")
            ? "official GPS & route geometry"
            : "illustrative demo routes"}
        </div>
        <div className="gerak-city-hint">
          Drag to orbit · right-drag to pan · pinch to explore
          {props.follow ? " · camera following selected vehicle" : ""}
        </div>
      </div>
    </SceneErrorBoundary>
  );
}
