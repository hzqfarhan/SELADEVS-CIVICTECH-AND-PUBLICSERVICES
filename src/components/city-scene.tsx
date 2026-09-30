'use client';

import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Coordinate, TransitRoute, Vehicle } from '@/lib/types';
import type { TransportMapProps } from './map-types';
import { createProjection, sampleMotion, updateMotions, type VehicleMotion } from './map-motion';

type Projection = ReturnType<typeof createProjection>;
type Instance = { position: [number, number, number]; scale: [number, number, number]; color: string; rotation?: number };

class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <>{this.props.fallback}<div className="gerak-city-fallback-note">3D unavailable on this device · showing the 2D map</div></> : this.props.children; }
}

function randomGenerator(seed: number) {
  return () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
}
function segmentDistance(x: number, z: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}

/** Buildings, roofs and trees each share geometry/material through instancing. */
function InstanceBatch({ instances, shape = 'box', roughness = 0.86, castShadow = true }: { instances: Instance[]; shape?: 'box' | 'tree' | 'trunk'; roughness?: number; castShadow?: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const object = new THREE.Object3D();
    instances.forEach((item, index) => { object.position.set(...item.position); object.scale.set(...item.scale); object.rotation.set(0, item.rotation ?? 0, 0); object.updateMatrix(); mesh.current!.setMatrixAt(index, object.matrix); mesh.current!.setColorAt(index, new THREE.Color(item.color)); });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [instances]);
  if (!instances.length) return null;
  return <instancedMesh ref={mesh} args={[undefined, undefined, instances.length]} castShadow={castShadow} receiveShadow>
    {shape === 'tree' ? <icosahedronGeometry args={[1, 0]} /> : shape === 'trunk' ? <cylinderGeometry args={[0.12, 0.16, 1, 5]} /> : <boxGeometry args={[1, 1, 1]} />}
    <meshStandardMaterial roughness={roughness} />
  </instancedMesh>;
}

function CityBlocks({ projection, routes, region }: { projection: Projection; routes: TransitRoute[]; region: string }) {
  const city = useMemo(() => {
    const random = randomGenerator(region === 'uthm' ? 606 : 2026);
    const paths = routes.map(route => route.path.map(projection.project));
    const awayFromRoad = (x: number, z: number, margin: number) => paths.every(path => path.slice(1).every((point, i) => segmentDistance(x, z, path[i], point) > margin));
    const buildings: Instance[] = [], roofs: Instance[] = [], windows: Instance[] = [], trees: Instance[] = [], trunks: Instance[] = [], streets: Instance[] = [], parks: Instance[] = [];
    const palette = ['#e6eddb', '#c5dfd7', '#a8d2cf', '#d5e5c6', '#b7cec0'];
    const grid = 7.5;
    for (let x = -projection.width / 2 + 6; x < projection.width / 2 - 5; x += grid) streets.push({ position: [x, 0.035, 0], scale: [0.56, 0.05, projection.depth - 4], color: '#609890' });
    for (let z = -projection.depth / 2 + 6; z < projection.depth / 2 - 5; z += grid) streets.push({ position: [0, 0.04, z], scale: [projection.width - 4, 0.05, 0.56], color: '#609890' });
    for (let i = 0; i < 500 && buildings.length < (region === 'uthm' ? 92 : 150); i++) {
      const x = (random() - .5) * (projection.width - 9), z = (random() - .5) * (projection.depth - 9);
      const w = 1.4 + random() * 2.7, d = 1.5 + random() * 2.7;
      if (!awayFromRoad(x, z, Math.max(w, d) / 2 + 1.2)) continue;
      if (buildings.some(building => Math.abs(x - building.position[0]) < (w + building.scale[0]) / 2 + .6 && Math.abs(z - building.position[2]) < (d + building.scale[2]) / 2 + .6)) continue;
      const tall = region === 'johor' && random() > .83;
      const h = tall ? 5.5 + random() * 8 : 1.5 + random() * (region === 'uthm' ? 2.8 : 3.6);
      const color = palette[Math.floor(random() * palette.length)];
      buildings.push({ position: [x, h / 2 + .13, z], scale: [w, h, d], color });
      roofs.push({ position: [x, h + .22, z], scale: [w + .09, .16, d + .09], color: tall ? '#719e98' : '#dae9d4' });
      if (h > 3) roofs.push({ position: [x + w * .12, h + .47, z], scale: [w * .52, .4, d * .5], color: '#83aca5' });
      const floors = Math.min(6, Math.floor(h / 1.5));
      for (let floor = 0; floor < floors; floor++) {
        windows.push({ position: [x, 1.3 + floor * 1.45, z + d / 2 + .02], scale: [w * .72, .37, .03], color: '#5c9594' });
        windows.push({ position: [x + w / 2 + .02, 1.3 + floor * 1.45, z], scale: [.03, .37, d * .72], color: '#77a9a1' });
      }
    }
    for (let i = 0; i < 320 && trees.length < 110; i++) {
      const x = (random() - .5) * (projection.width - 6), z = (random() - .5) * (projection.depth - 6);
      if (!awayFromRoad(x, z, 1.2) || buildings.some(building => Math.abs(x - building.position[0]) < building.scale[0] / 2 + .9 && Math.abs(z - building.position[2]) < building.scale[2] / 2 + .9)) continue;
      const size = .65 + random() * .5;
      trunks.push({ position: [x, .72, z], scale: [1, 1.25, 1], color: '#53796b' });
      trees.push({ position: [x, 1.48 + size * .3, z], scale: [size, size * 1.25, size], color: ['#397f6d', '#4a9576', '#72ab82', '#8db88a'][Math.floor(random() * 4)] });
    }
    for (let i = 0; i < 12; i++) {
      const x = (random() - .5) * (projection.width - 10), z = (random() - .5) * (projection.depth - 10);
      if (awayFromRoad(x, z, 4)) parks.push({ position: [x, .045, z], scale: [3 + random() * 4, .06, 3 + random() * 4], color: '#7aae87' });
    }
    return { buildings, roofs, windows, trees, trunks, streets, parks };
  }, [projection, routes, region]);
  return <group>
    <InstanceBatch instances={city.streets} castShadow={false} />
    <InstanceBatch instances={city.parks} castShadow={false} />
    <InstanceBatch instances={city.buildings} />
    <InstanceBatch instances={city.roofs} />
    <InstanceBatch instances={city.windows} castShadow={false} />
    <InstanceBatch instances={city.trees} shape="tree" />
    <InstanceBatch instances={city.trunks} shape="trunk" />
  </group>;
}

function Roads({ routes, projection }: { routes: TransitRoute[]; projection: Projection }) {
  const { roads, curbs } = useMemo(() => {
    const roads: Instance[] = [], curbs: Instance[] = [];
    for (const route of routes) {
      const points = route.path.map(projection.project);
      points.slice(1).forEach((point, i) => {
        const a = points[i], length = Math.hypot(point[0] - a[0], point[1] - a[1]);
        const rotation = Math.atan2(point[0] - a[0], point[1] - a[1]);
        roads.push({ position: [(point[0] + a[0]) / 2, .135, (point[1] + a[1]) / 2], scale: [1.8, .08, length + .75], rotation, color: '#416e6b' });
        curbs.push({ position: [(point[0] + a[0]) / 2, .075, (point[1] + a[1]) / 2], scale: [2.45, .08, length + 1], rotation, color: '#a5c8b8' });
      });
    }
    return { roads, curbs };
  }, [routes, projection]);
  return <group>
    <InstanceBatch instances={curbs} castShadow={false} />
    <InstanceBatch instances={roads} castShadow={false} />
    {routes.map((route, i) => <Line key={route.id} points={route.path.map(coordinate => { const [x, z] = projection.project(coordinate); return [x, .195 + i * .012, z] as [number, number, number]; })} color={route.color} lineWidth={2.1} transparent opacity={.95} />)}
  </group>;
}

function VehicleModel({ vehicle, color, selected, projection, motions, onSelect }: { vehicle: Vehicle; color: string; selected: boolean; projection: Projection; motions: RefObject<Map<string, VehicleMotion>>; onSelect: (id: string) => void }) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const initial = projection.project(vehicle.coordinate);
  useFrame((state, delta) => {
    const motion = motions.current.get(vehicle.id); if (!motion || !group.current) return;
    const sample = sampleMotion(motion, performance.now()); const [x, z] = projection.project(sample.coordinate);
    group.current.position.set(x, .32, z);
    const target = -sample.bearing * Math.PI / 180;
    const difference = Math.atan2(Math.sin(target - group.current.rotation.y), Math.cos(target - group.current.rotation.y));
    group.current.rotation.y += difference * (1 - Math.exp(-delta * 13));
    if (halo.current) { const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.4) * .08; halo.current.scale.set(pulse, pulse, 1); }
  });
  const choose = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(vehicle.id); };
  return <group ref={group} position={[initial[0], .32, initial[1]]} rotation={[0, -vehicle.bearing * Math.PI / 180, 0]} onClick={choose}>
    {selected && <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -.09, 0]}><ringGeometry args={[1.5, 1.75, 40]} /><meshBasicMaterial color={color} transparent opacity={.7} side={THREE.DoubleSide} /></mesh>}
    <mesh position={[0, .46, 0]} castShadow><boxGeometry args={[1.1, .64, 2.45]} /><meshStandardMaterial color={color} roughness={.5} /></mesh>
    <mesh position={[0, .87, -.02]} castShadow><boxGeometry args={[1.02, .37, 2.14]} /><meshStandardMaterial color="#cde4d3" roughness={.45} /></mesh>
    <mesh position={[0, .76, -1.24]}><boxGeometry args={[.87, .47, .045]} /><meshStandardMaterial color="#1c4547" roughness={.3} metalness={.15} /></mesh>
    <mesh position={[0, .88, .03]}><boxGeometry args={[1.04, .24, 1.69]} /><meshStandardMaterial color="#245252" roughness={.3} /></mesh>
    <mesh position={[0, 1.09, .1]}><boxGeometry args={[.71, .12, 1.25]} /><meshStandardMaterial color="#edf5dc" /></mesh>
    <mesh position={[0, .4, -1.28]}><boxGeometry args={[.88, .14, .04]} /><meshStandardMaterial color="#f8ffc9" emissive="#e4ffc0" emissiveIntensity={.4} /></mesh>
    <mesh position={[0, .4, 1.24]}><boxGeometry args={[.8, .11, .04]} /><meshStandardMaterial color="#d96f58" /></mesh>
    {[-.58, .58].flatMap(x => [-.79, .79].map(z => <mesh key={`${x}-${z}`} position={[x, .22, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.25, .25, .13, 10]} /><meshStandardMaterial color="#213e3b" roughness={.9} /></mesh>))}
    <mesh position={[0, .6, 0]} visible={false}><boxGeometry args={[2.2, 2.5, 3.5]} /><meshBasicMaterial /></mesh>
    <Html position={[0, 2.1, 0]} center distanceFactor={95} zIndexRange={[12, 0]}><button className={`gerak-city-bus-label ${selected ? 'is-selected' : ''}`} onClick={event => { event.stopPropagation(); onSelect(vehicle.id); }} aria-label={`Select ${vehicle.label}`}>{vehicle.label}</button></Html>
  </group>;
}

function CameraRig({ follow, selectedVehicleId, motions, projection, controlsRef }: { follow: boolean; selectedVehicleId: string | null; motions: RefObject<Map<string, VehicleMotion>>; projection: Projection; controlsRef: RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  const offset = useRef(new THREE.Vector3(17, 23, 26));
  const wasFollowing = useRef(false);
  const desiredTarget = useRef(new THREE.Vector3());
  useFrame((_, delta) => {
    const controls = controlsRef.current; if (!controls) return;
    if (!follow || !selectedVehicleId) { wasFollowing.current = false; return; }
    const motion = motions.current.get(selectedVehicleId); if (!motion) return;
    const [x, z] = projection.project(sampleMotion(motion, performance.now()).coordinate);
    if (!wasFollowing.current) { offset.current.copy(camera.position).sub(controls.target).normalize().multiplyScalar(36); wasFollowing.current = true; }
    desiredTarget.current.set(x, .9, z);
    const damping = 1 - Math.exp(-Math.min(delta, .1) * 3);
    controls.target.lerp(desiredTarget.current, damping);
    camera.position.lerp(desiredTarget.current.clone().add(offset.current), damping);
    controls.update();
  });
  return null;
}

function Ground({ projection, picking, onPick }: { projection: Projection; picking?: boolean; onPick?: (coordinate: Coordinate) => void }) {
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]} receiveShadow><planeGeometry args={[800, 800]} /><meshStandardMaterial color="#235e62" roughness={.8} /></mesh>
    <mesh position={[0, -.74, 0]} receiveShadow castShadow><boxGeometry args={[projection.width + .6, 1.5, projection.depth + .6]} /><meshStandardMaterial color="#406f64" roughness={1} /></mesh>
    <mesh position={[0, -.07, 0]} receiveShadow onClick={event => { if (picking && onPick) { event.stopPropagation(); onPick(projection.unproject([event.point.x, event.point.z])); } }}><boxGeometry args={[projection.width, .18, projection.depth]} /><meshStandardMaterial color="#82b5a2" roughness={1} /></mesh>
    <mesh position={[0, -.03, projection.depth / 2 - .65]} receiveShadow><boxGeometry args={[projection.width - 1, .18, 1.15]} /><meshStandardMaterial color="#c9d6b4" /></mesh>
    <mesh position={[0, -.03, projection.depth / 2 - 2]}><boxGeometry args={[projection.width - 1, .18, 1.2]} /><meshStandardMaterial color="#689780" /></mesh>
  </group>;
}

function ContextLossWatcher({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => { const canvas = gl.domElement; canvas.addEventListener('webglcontextlost', onLost); return () => canvas.removeEventListener('webglcontextlost', onLost); }, [gl, onLost]);
  return null;
}

function World({ props, projection, controlsRef, onLost }: { props: TransportMapProps; projection: Projection; controlsRef: RefObject<OrbitControlsImpl | null>; onLost: () => void }) {
  const motions = useRef(new Map<string, VehicleMotion>());
  useEffect(() => { updateMotions(motions.current, props.vehicles, props.routes, performance.now()); }, [props.vehicles, props.routes]);
  const [picked, setPicked] = useState<Coordinate | null>(null);
  const pick = (coordinate: Coordinate) => { setPicked(coordinate); props.onPick?.(coordinate); };
  const nearReports = props.reports.filter(report => { const [x, z] = projection.project(report.coordinate); return Math.abs(x) < projection.width / 2 && Math.abs(z) < projection.depth / 2 && report.status !== 'resolved'; });
  return <>
    <color attach="background" args={['#235e62']} />
    <fog attach="fog" args={['#235e62', 155, 300]} />
    <ambientLight intensity={1.15} color="#cdece0" />
    <hemisphereLight args={['#ddf8ed', '#52796f', 1.1]} />
    <directionalLight position={[-32, 64, 35]} intensity={2.4} color="#fff8db" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-64} shadow-camera-right={64} shadow-camera-top={70} shadow-camera-bottom={-70} shadow-camera-far={180} shadow-bias={-.001} shadow-normalBias={.15} />
    <Ground projection={projection} picking={props.picking} onPick={pick} />
    <CityBlocks projection={projection} routes={props.routes} region={props.region} />
    <Roads projection={projection} routes={props.routes} />
    {props.stops.map((stop, i) => { const [x, z] = projection.project(stop.coordinate); return <group key={stop.id} position={[x, .25, z]} onClick={event => { event.stopPropagation(); props.onSelectStop?.(stop.id); }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.54, 16]} /><meshBasicMaterial color="#e7f6ce" /></mesh>
      <mesh position={[.85, .66, 0]} castShadow><boxGeometry args={[.06, 1.25, .06]} /><meshStandardMaterial color="#e2efde" /></mesh>
      <mesh position={[.85, 1.3, 0]}><boxGeometry args={[.65, .4, .12]} /><meshStandardMaterial color="#294e45" /></mesh>
      {(i % 2 === 0 || props.stops.length < 7) && <Html position={[0, 2.2, 0]} center distanceFactor={100} zIndexRange={[5, 0]}><button className="gerak-city-stop-label" onClick={event => { event.stopPropagation(); props.onSelectStop?.(stop.id); }}>{stop.name}</button></Html>}
    </group>; })}
    {props.vehicles.map(vehicle => <VehicleModel key={vehicle.id} vehicle={vehicle} color={props.routes.find(route => route.id === vehicle.routeId)?.color ?? '#b3f56b'} selected={vehicle.id === props.selectedVehicleId} projection={projection} motions={motions} onSelect={props.onSelectVehicle} />)}
    {nearReports.map(report => { const [x, z] = projection.project(report.coordinate); return <group key={report.id} position={[x, .21, z]}>
      {props.heatmap && <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[4, 28]} /><meshBasicMaterial color="#ffb354" transparent opacity={.3} depthWrite={false} /></mesh>}
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[.06, .06, 1.8, 6]} /><meshStandardMaterial color="#d79f48" /></mesh>
      <Html position={[0, 2.2, 0]} center zIndexRange={[8, 0]}><span className="gerak-city-report-label" title={`${report.title} · ${report.status}`}>!</span></Html>
    </group>; })}
    {picked && <mesh position={[projection.project(picked)[0], .28, projection.project(picked)[1]]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.6, 1.15, 32]} /><meshBasicMaterial color="#ffd387" side={THREE.DoubleSide} /></mesh>}
    <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={.08} minDistance={15} maxDistance={180} minPolarAngle={.2} maxPolarAngle={Math.PI / 2.25} enablePan={!props.follow} enableRotate={!props.follow} enableZoom={!props.follow} target={[0, 0, 0]} />
    <CameraRig follow={props.follow} selectedVehicleId={props.selectedVehicleId} motions={motions} projection={projection} controlsRef={controlsRef} />
    <ContextLossWatcher onLost={onLost} />
  </>;
}

export default function CityScene(props: TransportMapProps & { fallback: ReactNode }) {
  const projection = useMemo(() => createProjection(props.routes, props.region), [props.routes, props.region]);
  const controls = useRef<OrbitControlsImpl>(null);
  const [lost, setLost] = useState(false);
  const handleLost = useMemo(() => () => setLost(true), []);
  const zoom = (factor: number) => { if (!controls.current) return; const control = controls.current; const offset = control.object.position.clone().sub(control.target).multiplyScalar(factor); control.object.position.copy(control.target).add(offset); control.update(); };
  const reset = () => { if (!controls.current) return; controls.current.target.set(0, 0, 0); controls.current.object.position.set(58, 75, 83); controls.current.update(); };
  if (lost) return <>{props.fallback}<div className="gerak-city-fallback-note">3D context lost · showing the 2D map</div></>;
  return <SceneErrorBoundary fallback={props.fallback}>
    <div className={`gerak-city-scene ${props.picking ? 'gerak-city-picking' : ''}`} data-testid="map-3d">
      <Canvas key={props.region} shadows dpr={[1, 1.5]} camera={{ position: [58, 75, 83], fov: 42, near: .5, far: 450 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} fallback={<>{props.fallback}<div className="gerak-city-fallback-note">WebGL unavailable · showing the 2D map</div></>} onCreated={({ gl }) => { gl.setClearColor('#235e62'); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.15; }}>
        <Suspense fallback={null}><World props={props} projection={projection} controlsRef={controls} onLost={handleLost} /></Suspense>
      </Canvas>
      <div className="gerak-city-north" aria-hidden="true"><span>N</span><svg viewBox="0 0 20 25"><path d="M10 0 18 23 10 17 2 23Z" fill="#d4e6d4" /><path d="M10 0 10 17 2 23Z" fill="#679489" /></svg></div>
      <div className="gerak-map-navigation" aria-label="3D map controls"><button type="button" aria-label="Zoom in 3D" onClick={() => zoom(.8)}>+</button><button type="button" aria-label="Zoom out 3D" onClick={() => zoom(1.25)}>−</button><span /><button type="button" aria-label="Reset 3D camera" onClick={reset}>⌖</button></div>
      <div className="gerak-city-mode-note"><strong>A little {props.region === 'johor' ? 'Johor Bahru' : 'UTHM'}. Always moving.</strong>Stylized buildings & terrain · {props.vehicles.some(v=>v.source==='gtfs-rt')?'official GPS & route geometry':'illustrative demo routes'}</div>
      <div className="gerak-city-hint">Drag to orbit · right-drag to pan · pinch to explore{props.follow ? ' · camera following selected vehicle' : ''}</div>
    </div>
  </SceneErrorBoundary>;
}
