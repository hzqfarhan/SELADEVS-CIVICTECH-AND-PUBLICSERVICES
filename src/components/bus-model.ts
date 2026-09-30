import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export const BUS_WHEEL_RADIUS = 0.7;
export function wheelTurn(distanceMetres: number, radius = BUS_WHEEL_RADIUS) {
  return distanceMetres / radius;
}

/** Original low-poly city bus: x right, y forward, z up, dimensions in metres. */
export function buildBus(
  color: string,
  variant = 0,
  kind: "bus" | "rail" = "bus",
) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const materials: THREE.Material[] = [];
  const haloMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  materials.push(haloMaterial);
  const selection = new THREE.Mesh(
    new THREE.RingGeometry(1.85, 2.1, 48),
    haloMaterial,
  );
  selection.scale.set(1, 3, 1);
  selection.position.z = 0.1;
  selection.visible = false;
  root.add(selection);
  const material = (hex: string) => {
    const result = new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.65,
      metalness: 0.08,
    });
    materials.push(result);
    return result;
  };
  const paint = material(color),
    glass = material("#14323e"),
    roof = material(variant % 2 ? "#f2f5ea" : "#293941"),
    rubber = material("#151a20"),
    alloy = material("#b7cad0"),
    white = material("#f5f9ef"),
    red = material("#ff5e61");
  white.emissive.set("#ffe7ac");
  white.emissiveIntensity = 0.3;
  red.emissive.set("#ff243b");
  red.emissiveIntensity = 1.4;
  glass.metalness = 0.45;
  glass.roughness = 0.2;
  const headlight = material("#fff5d6");
  headlight.emissive.set("#fff1c4");
  headlight.emissiveIntensity = 2;
  const box = (
    parent: THREE.Group,
    size: number[],
    position: number[],
    mat: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(
        size[0],
        size[1],
        size[2],
        1,
        Math.min(...size) * 0.12,
      ),
      mat,
    );
    mesh.position.set(position[0], position[1], position[2]);
    parent.add(mesh);
    return mesh;
  };
  box(body, [2.5, 11.5, 1.4], [0, 0, 1.25], paint);
  box(body, [2.42, 10.9, 1.05], [0, 0, 2.45], glass);
  box(body, [2.55, 11.3, 0.24], [0, 0, 3.08], roof);
  box(body, [1.4, 3.2, 0.32], [0, -0.5, 3.34], white);
  box(body, [2.55, 11.2, 0.16], [0, 0, variant % 3 === 0 ? 1.05 : 1.7], white);
  for (const x of [-1.24, 1.24]) {
    for (let y = -4.6; y <= 4.6; y += 1.5)
      box(body, [0.055, 0.08, 1.08], [x, y, 2.46], paint);
    box(body, [0.12, 0.45, 0.55], [x * 1.22, 4.95, 2.35], roof);
  }
  // Passenger doors, destination board, front lamps and rear brake lamps.
  box(body, [0.07, 1.25, 2.05], [1.28, 3.8, 1.65], glass);
  box(body, [0.08, 0.055, 2.05], [1.32, 3.8, 1.65], alloy);
  box(body, [1.7, 0.06, 0.28], [0, 5.48, 2.86], rubber);
  box(body, [1.25, 0.07, 0.07], [0, 5.53, 2.86], white);
  for (const x of [-0.88, 0.88]) {
    box(body, [0.42, 0.08, 0.2], [x, 5.79, 1.12], headlight);
    box(body, [0.22, 0.08, 0.4], [x, -5.79, 1.18], red);
  }
  // Bumpers, radiator slats, split windscreen and roof ventilation.
  for (const y of [-5.78, 5.78])
    box(body, [2.3, 0.12, 0.18], [0, y, 0.72], rubber);
  for (let z = 0.95; z < 1.5; z += 0.14)
    box(body, [0.95, 0.05, 0.035], [0, 5.77, z], rubber);
  box(body, [0.055, 0.06, 0.84], [0, 5.49, 2.35], alloy);
  for (let y = -1.8; y < 0.9; y += 0.3)
    box(body, [1.15, 0.065, 0.035], [0, y, 3.52], rubber);
  for (const x of [-1.28, 1.28]) {
    for (const y of [-4.7, 0, 4.7])
      box(body, [0.03, 0.12, 0.08], [x, y, 1.1], headlight);
    box(body, [0.045, 0.8, 0.14], [x, 2.2, 1.4], alloy);
  }
  const wheels: THREE.Group[] = [];
  for (const x of [-1.25, 1.25])
    for (const y of [-3.5, 3.6]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, y, BUS_WHEEL_RADIUS + 0.05);
      const tyre = new THREE.Mesh(
        new THREE.CylinderGeometry(
          BUS_WHEEL_RADIUS,
          BUS_WHEEL_RADIUS,
          0.44,
          20,
        ),
        rubber,
      );
      tyre.rotation.z = Math.PI / 2;
      wheel.add(tyre);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.46, 16),
        alloy,
      );
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      // Visible asymmetric spoke highlights make rolling rotation readable.
      box(wheel, [0.48, 0.09, 0.9], [0, 0, 0], white);
      box(wheel, [0.48, 0.9, 0.09], [0, 0, 0], alloy);
      root.add(wheel);
      wheels.push(wheel);
    }
  if (kind === "rail") {
    root.scale.y = 1.6;
    box(body, [1.8, 4, 0.15], [0, 0.5, 3.65], alloy);
  }
  return {
    root,
    body,
    selection,
    wheels,
    dispose: () => {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      materials.forEach((m) => m.dispose());
    },
  };
}
