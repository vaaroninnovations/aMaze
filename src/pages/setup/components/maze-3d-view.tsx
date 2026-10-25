import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export type MazeTypeId =
  | "y_maze"
  | "epm"
  | "water_maze"
  | "barnes_maze"
  | "zero_maze"
  | "radial_arm"
  | "three_zone"
  | "open_field";

interface Maze3DViewProps {
  mazeType: MazeTypeId;
  species: "Mouse" | "Rat";
  colorContrast: "White" | "Black";
  className?: string;
  autoRotate?: boolean;
}

export default function Maze3DView({
  mazeType,
  species,
  colorContrast,
  className = "w-full h-56",
  autoRotate = true,
}: Maze3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 320;
    let height = container.clientHeight || 220;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 3.2, 4.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 6, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x7edbd0, 0.6);
    rimLight.position.set(-3.5, 3.5, -3.5);
    scene.add(rimLight);

    // 3. User Rule:
    // CTA "Black" -> Black Maze with White Animal
    // CTA "White" -> White Maze with Black Animal
    const isRat = species === "Rat";
    const isBlackMaze = colorContrast === "Black";

    // Dynamic Floor & Wall Colors
    const floorColor = isBlackMaze ? 0x16181b : 0xf5f8f7;
    const wallColor = isBlackMaze ? 0x24282c : 0xdce4e2;
    const accentLineColor = isBlackMaze ? 0x52d8c4 : 0x08796f;

    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.55,
      metalness: 0.08,
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.42,
      metalness: 0.1,
    });

    const transparentWallMat = new THREE.MeshPhysicalMaterial({
      color: isBlackMaze ? 0x33444b : 0xe0f0ee,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      transmission: 0.82,
      ior: 1.4,
    });

    const baseStandMat = new THREE.MeshStandardMaterial({
      color: 0x3a4245,
      roughness: 0.35,
      metalness: 0.5,
    });

    // Scale multiplier: Rat apparatus is larger and has wider corridors
    const scaleFactor = isRat ? 1.25 : 0.95;
    const corridorWidth = (isRat ? 0.36 : 0.22) * scaleFactor;
    const wallHeight = (isRat ? 0.55 : 0.35) * scaleFactor;

    const mazeGroup = new THREE.Group();
    scene.add(mazeGroup);

    // 4. Build Specific Maze Geometry
    switch (mazeType) {
      // ----------------------------------------
      // 1. Y-MAZE (3 symmetrical arms at 120°)
      // ----------------------------------------
      case "y_maze": {
        const armLength = 1.35 * scaleFactor;
        const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

        angles.forEach((angle) => {
          const armGroup = new THREE.Group();
          armGroup.rotation.y = angle;

          // Floor
          const floorGeo = new THREE.BoxGeometry(corridorWidth, 0.04, armLength);
          const floorMesh = new THREE.Mesh(floorGeo, floorMat);
          floorMesh.position.set(0, 0, armLength / 2);
          floorMesh.receiveShadow = true;
          armGroup.add(floorMesh);

          // Left Wall
          const lWallGeo = new THREE.BoxGeometry(0.04, wallHeight, armLength);
          const lWall = new THREE.Mesh(lWallGeo, wallMat);
          lWall.position.set(-corridorWidth / 2 - 0.02, wallHeight / 2, armLength / 2);
          lWall.castShadow = true;
          armGroup.add(lWall);

          // Right Wall
          const rWall = new THREE.Mesh(lWallGeo, wallMat);
          rWall.position.set(corridorWidth / 2 + 0.02, wallHeight / 2, armLength / 2);
          rWall.castShadow = true;
          armGroup.add(rWall);

          // End Cap
          const capGeo = new THREE.BoxGeometry(corridorWidth + 0.08, wallHeight, 0.04);
          const cap = new THREE.Mesh(capGeo, wallMat);
          cap.position.set(0, wallHeight / 2, armLength);
          armGroup.add(cap);

          mazeGroup.add(armGroup);
        });

        // Central triangular junction
        const centerGeo = new THREE.CylinderGeometry(corridorWidth * 0.75, corridorWidth * 0.75, 0.04, 3);
        const centerMesh = new THREE.Mesh(centerGeo, floorMat);
        centerMesh.position.y = 0;
        mazeGroup.add(centerMesh);
        break;
      }

      // ----------------------------------------
      // 2. ELEVATED PLUS MAZE (EPM: 2 open + 2 closed arms)
      // ----------------------------------------
      case "epm": {
        const armLength = 1.35 * scaleFactor;
        const legElevation = 1.1;

        // Central Pedestal Support
        const standGeo = new THREE.CylinderGeometry(0.09, 0.14, legElevation, 16);
        const standMesh = new THREE.Mesh(standGeo, baseStandMat);
        standMesh.position.set(0, -legElevation / 2, 0);
        mazeGroup.add(standMesh);

        // Center square hub
        const hubGeo = new THREE.BoxGeometry(corridorWidth, 0.04, corridorWidth);
        const hubMesh = new THREE.Mesh(hubGeo, floorMat);
        mazeGroup.add(hubMesh);

        // 4 Arms
        const directions = [
          { angle: 0, isClosed: true },
          { angle: Math.PI / 2, isClosed: false },
          { angle: Math.PI, isClosed: true },
          { angle: (3 * Math.PI) / 2, isClosed: false },
        ];

        directions.forEach(({ angle, isClosed }) => {
          const armGroup = new THREE.Group();
          armGroup.rotation.y = angle;

          // Corridor Floor
          const floorGeo = new THREE.BoxGeometry(corridorWidth, 0.04, armLength);
          const floorMesh = new THREE.Mesh(floorGeo, floorMat);
          floorMesh.position.set(0, 0, armLength / 2 + corridorWidth / 2);
          floorMesh.receiveShadow = true;
          armGroup.add(floorMesh);

          if (isClosed) {
            // Closed Arm: High opaque walls
            const wallThick = 0.035;
            const sideWallGeo = new THREE.BoxGeometry(wallThick, wallHeight, armLength);

            const leftW = new THREE.Mesh(sideWallGeo, wallMat);
            leftW.position.set(-corridorWidth / 2 - wallThick / 2, wallHeight / 2, armLength / 2 + corridorWidth / 2);
            leftW.castShadow = true;
            armGroup.add(leftW);

            const rightW = new THREE.Mesh(sideWallGeo, wallMat);
            rightW.position.set(corridorWidth / 2 + wallThick / 2, wallHeight / 2, armLength / 2 + corridorWidth / 2);
            rightW.castShadow = true;
            armGroup.add(rightW);

            const endWGeo = new THREE.BoxGeometry(corridorWidth + wallThick * 2, wallHeight, wallThick);
            const endW = new THREE.Mesh(endWGeo, wallMat);
            endW.position.set(0, wallHeight / 2, armLength + corridorWidth / 2);
            armGroup.add(endW);
          } else {
            // Open Arm: Minimal ledge / lip
            const lipGeo = new THREE.BoxGeometry(0.015, 0.03, armLength);
            const lipMat = new THREE.MeshStandardMaterial({ color: accentLineColor, roughness: 0.3 });
            const leftLip = new THREE.Mesh(lipGeo, lipMat);
            leftLip.position.set(-corridorWidth / 2, 0.02, armLength / 2 + corridorWidth / 2);
            armGroup.add(leftLip);

            const rightLip = new THREE.Mesh(lipGeo, lipMat);
            rightLip.position.set(corridorWidth / 2, 0.02, armLength / 2 + corridorWidth / 2);
            armGroup.add(rightLip);
          }

          mazeGroup.add(armGroup);
        });
        break;
      }

      // ----------------------------------------
      // 3. MORRIS WATER MAZE (Circular Pool + Hidden Island)
      // ----------------------------------------
      case "water_maze": {
        const poolRadius = 1.35 * scaleFactor;
        const poolDepth = 0.55 * scaleFactor;

        // Circular Tank Wall
        const wallGeo = new THREE.CylinderGeometry(poolRadius, poolRadius, poolDepth, 48, 1, true);
        const poolWall = new THREE.Mesh(wallGeo, wallMat);
        poolWall.position.y = poolDepth / 2;
        mazeGroup.add(poolWall);

        // Pool Tank Floor
        const tankFloorGeo = new THREE.CircleGeometry(poolRadius, 48);
        const tankFloor = new THREE.Mesh(tankFloorGeo, floorMat);
        tankFloor.rotation.x = -Math.PI / 2;
        tankFloor.position.y = 0;
        mazeGroup.add(tankFloor);

        // Water surface with realistic physical material
        const waterGeo = new THREE.CircleGeometry(poolRadius * 0.98, 48);
        const waterMat = new THREE.MeshPhysicalMaterial({
          color: isBlackMaze ? 0x0a141c : 0xb5e0de,
          transparent: true,
          opacity: 0.72,
          roughness: 0.1,
          transmission: 0.75,
          ior: 1.33,
        });
        const waterSurface = new THREE.Mesh(waterGeo, waterMat);
        waterSurface.rotation.x = -Math.PI / 2;
        waterSurface.position.y = poolDepth * 0.72;
        mazeGroup.add(waterSurface);

        // Submerged Escape Platform (Quadrant NE)
        const platformRadius = (isRat ? 0.22 : 0.14) * scaleFactor;
        const platformGeo = new THREE.CylinderGeometry(platformRadius, platformRadius, 0.04, 24);
        const platformMat = new THREE.MeshStandardMaterial({
          color: accentLineColor,
          roughness: 0.2,
          metalness: 0.4,
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(poolRadius * 0.48, poolDepth * 0.72 + 0.015, -poolRadius * 0.48);
        mazeGroup.add(platform);
        break;
      }

      // ----------------------------------------
      // 4. BARNES MAZE (Circular Disk with Perimeter Escape Holes)
      // ----------------------------------------
      case "barnes_maze": {
        const diskRadius = 1.45 * scaleFactor;
        const standHeight = 0.9;
        const holeCount = 20;

        // Elevated Base Stand
        const standGeo = new THREE.CylinderGeometry(0.1, 0.16, standHeight, 16);
        const standMesh = new THREE.Mesh(standGeo, baseStandMat);
        standMesh.position.set(0, -standHeight / 2, 0);
        mazeGroup.add(standMesh);

        // Circular Table Disk
        const diskGeo = new THREE.CylinderGeometry(diskRadius, diskRadius, 0.05, 52);
        const diskMesh = new THREE.Mesh(diskGeo, floorMat);
        diskMesh.receiveShadow = true;
        mazeGroup.add(diskMesh);

        // Center habituation start zone circle
        const centerLineGeo = new THREE.RingGeometry(0.24, 0.26, 32);
        const centerLineMat = new THREE.MeshBasicMaterial({ color: accentLineColor, side: THREE.DoubleSide });
        const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.position.y = 0.03;
        mazeGroup.add(centerLine);

        // Perimeter Escape Holes
        const holeRadius = (isRat ? 0.075 : 0.048) * scaleFactor;
        const holeCircleR = diskRadius * 0.86;

        for (let i = 0; i < holeCount; i++) {
          const angle = (i * 2 * Math.PI) / holeCount;
          const x = Math.cos(angle) * holeCircleR;
          const z = Math.sin(angle) * holeCircleR;

          // Target escape hole is highlighted with subtle box beneath
          const isTargetHole = i === 3;
          const holeGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, 0.06, 16);
          const holeMat = new THREE.MeshBasicMaterial({
            color: isTargetHole ? accentLineColor : (isBlackMaze ? 0x050607 : 0x1f2326),
          });
          const hole = new THREE.Mesh(holeGeo, holeMat);
          hole.position.set(x, 0.02, z);
          mazeGroup.add(hole);

          if (isTargetHole) {
            // Escape box underneath
            const boxGeo = new THREE.BoxGeometry(holeRadius * 2.4, 0.18, holeRadius * 2.4);
            const boxMesh = new THREE.Mesh(boxGeo, wallMat);
            boxMesh.position.set(x, -0.1, z);
            mazeGroup.add(boxMesh);
          }
        }
        break;
      }

      // ----------------------------------------
      // 5. ELEVATED ZERO MAZE (Annular Ring: 2 Open, 2 Closed)
      // ----------------------------------------
      case "zero_maze": {
        const outerRadius = 1.45 * scaleFactor;
        const innerRadius = outerRadius - corridorWidth;
        const legElevation = 1.0;

        // Base 4 legs
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2 + Math.PI / 4;
          const legX = Math.cos(angle) * ((outerRadius + innerRadius) / 2);
          const legZ = Math.sin(angle) * ((outerRadius + innerRadius) / 2);
          const legGeo = new THREE.CylinderGeometry(0.04, 0.05, legElevation, 12);
          const leg = new THREE.Mesh(legGeo, baseStandMat);
          leg.position.set(legX, -legElevation / 2, legZ);
          mazeGroup.add(leg);
        }

        // Annular Ring Floor (4 quadrants)
        const quadrants = [
          { startAngle: 0, isClosed: false },
          { startAngle: Math.PI / 2, isClosed: true },
          { startAngle: Math.PI, isClosed: false },
          { startAngle: (3 * Math.PI) / 2, isClosed: true },
        ];

        quadrants.forEach(({ startAngle, isClosed }) => {
          const quadGeo = new THREE.RingGeometry(innerRadius, outerRadius, 24, 1, startAngle, Math.PI / 2);
          const quadMesh = new THREE.Mesh(quadGeo, floorMat);
          quadMesh.rotation.x = -Math.PI / 2;
          quadMesh.receiveShadow = true;
          mazeGroup.add(quadMesh);

          if (isClosed) {
            // Closed Quadrant: Inner and outer arc walls
            const segs = 18;
            for (let s = 0; s < segs; s++) {
              const a1 = startAngle + (s / segs) * (Math.PI / 2);
              const a2 = startAngle + ((s + 1) / segs) * (Math.PI / 2);
              const midA = (a1 + a2) / 2;
              const arcLen = (Math.PI / 2 / segs);

              // Outer Wall segment
              const outWGeo = new THREE.BoxGeometry(outerRadius * arcLen * 1.05, wallHeight, 0.03);
              const outW = new THREE.Mesh(outWGeo, wallMat);
              outW.position.set(Math.cos(midA) * outerRadius, wallHeight / 2, Math.sin(midA) * outerRadius);
              outW.rotation.y = -midA + Math.PI / 2;
              mazeGroup.add(outW);

              // Inner Wall segment
              const inWGeo = new THREE.BoxGeometry(innerRadius * arcLen * 1.05, wallHeight, 0.03);
              const inW = new THREE.Mesh(inWGeo, wallMat);
              inW.position.set(Math.cos(midA) * innerRadius, wallHeight / 2, Math.sin(midA) * innerRadius);
              inW.rotation.y = -midA + Math.PI / 2;
              mazeGroup.add(inW);
            }
          } else {
            // Open quadrant minimal curb
            const curbGeo = new THREE.RingGeometry(outerRadius - 0.015, outerRadius, 20, 1, startAngle, Math.PI / 2);
            const curb = new THREE.Mesh(curbGeo, new THREE.MeshBasicMaterial({ color: accentLineColor }));
            curb.rotation.x = -Math.PI / 2;
            curb.position.y = 0.015;
            mazeGroup.add(curb);
          }
        });
        break;
      }

      // ----------------------------------------
      // 6. RADIAL ARM MAZE (Central Hub with 8 Radiating Arms)
      // ----------------------------------------
      case "radial_arm": {
        const hubRadius = 0.55 * scaleFactor;
        const armLen = 1.25 * scaleFactor;
        const armCount = 8;

        // Central Octagonal Hub Floor
        const hubGeo = new THREE.CylinderGeometry(hubRadius, hubRadius, 0.04, armCount);
        const hubMesh = new THREE.Mesh(hubGeo, floorMat);
        mazeGroup.add(hubMesh);

        // Central support leg
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 16), baseStandMat);
        leg.position.y = -0.45;
        mazeGroup.add(leg);

        for (let i = 0; i < armCount; i++) {
          const angle = (i * 2 * Math.PI) / armCount;
          const armGroup = new THREE.Group();
          armGroup.rotation.y = angle;

          // Arm Floor
          const aFloorGeo = new THREE.BoxGeometry(corridorWidth, 0.04, armLen);
          const aFloor = new THREE.Mesh(aFloorGeo, floorMat);
          aFloor.position.set(0, 0, armLen / 2 + hubRadius * 0.9);
          aFloor.receiveShadow = true;
          armGroup.add(aFloor);

          // Walls (Clear acrylic or opaque)
          const sideWGeo = new THREE.BoxGeometry(0.02, wallHeight * 0.7, armLen);
          const leftW = new THREE.Mesh(sideWGeo, transparentWallMat);
          leftW.position.set(-corridorWidth / 2, (wallHeight * 0.7) / 2, armLen / 2 + hubRadius * 0.9);
          armGroup.add(leftW);

          const rightW = new THREE.Mesh(sideWGeo, transparentWallMat);
          rightW.position.set(corridorWidth / 2, (wallHeight * 0.7) / 2, armLen / 2 + hubRadius * 0.9);
          armGroup.add(rightW);

          // Food Cup at arm terminus
          const cupGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.03, 12);
          const cup = new THREE.Mesh(cupGeo, new THREE.MeshStandardMaterial({ color: accentLineColor }));
          cup.position.set(0, 0.03, armLen + hubRadius * 0.85);
          armGroup.add(cup);

          mazeGroup.add(armGroup);
        }
        break;
      }

      // ----------------------------------------
      // 7. 3-ZONE SOCIABILITY CHAMBER
      // ----------------------------------------
      case "three_zone": {
        const boxLength = 2.4 * scaleFactor;
        const boxWidth = 0.9 * scaleFactor;
        const zoneWidth = boxLength / 3;

        // Floor
        const floorGeo = new THREE.BoxGeometry(boxLength, 0.04, boxWidth);
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.receiveShadow = true;
        mazeGroup.add(floorMesh);

        // Outer Walls
        const wallThick = 0.04;
        const frontW = new THREE.Mesh(new THREE.BoxGeometry(boxLength, wallHeight, wallThick), transparentWallMat);
        frontW.position.set(0, wallHeight / 2, boxWidth / 2);
        mazeGroup.add(frontW);

        const backW = new THREE.Mesh(new THREE.BoxGeometry(boxLength, wallHeight, wallThick), wallMat);
        backW.position.set(0, wallHeight / 2, -boxWidth / 2);
        mazeGroup.add(backW);

        const leftW = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, boxWidth), wallMat);
        leftW.position.set(-boxLength / 2, wallHeight / 2, 0);
        mazeGroup.add(leftW);

        const rightW = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, boxWidth), wallMat);
        rightW.position.set(boxLength / 2, wallHeight / 2, 0);
        mazeGroup.add(rightW);

        // Partition Walls with central rodent doorways
        [-zoneWidth / 2, zoneWidth / 2].forEach((xPos) => {
          const doorWidth = corridorWidth * 0.9;
          const leftPartW = (boxWidth - doorWidth) / 2;

          const p1 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, leftPartW), transparentWallMat);
          p1.position.set(xPos, wallHeight / 2, -boxWidth / 2 + leftPartW / 2);
          mazeGroup.add(p1);

          const p2 = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, leftPartW), transparentWallMat);
          p2.position.set(xPos, wallHeight / 2, boxWidth / 2 - leftPartW / 2);
          mazeGroup.add(p2);

          // Doorway Arch Header
          const arch = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight * 0.35, doorWidth), transparentWallMat);
          arch.position.set(xPos, wallHeight - (wallHeight * 0.35) / 2, 0);
          mazeGroup.add(arch);
        });

        // Wire conspecific containment cups in Left and Right chambers
        [-zoneWidth, zoneWidth].forEach((xPos) => {
          const cupRadius = 0.16 * scaleFactor;
          const cupGeo = new THREE.CylinderGeometry(cupRadius, cupRadius, wallHeight * 0.75, 16, 4, true);
          const wireMat = new THREE.MeshStandardMaterial({
            color: accentLineColor,
            wireframe: true,
          });
          const cupMesh = new THREE.Mesh(cupGeo, wireMat);
          cupMesh.position.set(xPos, (wallHeight * 0.75) / 2, 0);
          mazeGroup.add(cupMesh);
        });
        break;
      }

      // ----------------------------------------
      // 8. OPEN FIELD TEST
      // ----------------------------------------
      case "open_field":
      default: {
        const arenaSize = 2.0 * scaleFactor;

        // Base Floor
        const floorGeo = new THREE.BoxGeometry(arenaSize, 0.04, arenaSize);
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.receiveShadow = true;
        mazeGroup.add(floorMesh);

        // Center Zone Square Grid Marker
        const centerLineGeo = new THREE.RingGeometry(arenaSize * 0.24, arenaSize * 0.255, 36);
        const centerLineMat = new THREE.MeshBasicMaterial({
          color: accentLineColor,
          side: THREE.DoubleSide,
        });
        const centerLine = new THREE.Mesh(centerLineGeo, centerLineMat);
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.position.y = 0.025;
        mazeGroup.add(centerLine);

        // Boundary Walls
        const wallThickness = 0.04;
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(arenaSize + wallThickness * 2, wallHeight, wallThickness), wallMat);
        w1.position.set(0, wallHeight / 2, arenaSize / 2);
        w1.castShadow = true;
        mazeGroup.add(w1);

        const w2 = new THREE.Mesh(new THREE.BoxGeometry(arenaSize + wallThickness * 2, wallHeight, wallThickness), wallMat);
        w2.position.set(0, wallHeight / 2, -arenaSize / 2);
        w2.castShadow = true;
        mazeGroup.add(w2);

        const w3 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize), wallMat);
        w3.position.set(arenaSize / 2, wallHeight / 2, 0);
        w3.castShadow = true;
        mazeGroup.add(w3);

        const w4 = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize), wallMat);
        w4.position.set(-arenaSize / 2, wallHeight / 2, 0);
        w4.castShadow = true;
        mazeGroup.add(w4);
        break;
      }
    }

    // ------------------------------------------
    // 5. MINI 3D RODENT INSIDE THE MAZE
    // RULE:
    // CTA "Black" (Black Maze) -> White Animal
    // CTA "White" (White Maze) -> Black Animal
    // ------------------------------------------
    const miniRodent = new THREE.Group();
    const miniScale = isRat ? 0.24 : 0.15;

    // Strict contrast inversion
    const miniFurColor = isBlackMaze ? 0xfbfdfc : 0x141518;
    const miniEyeColor = isBlackMaze ? 0xc7102e : 0x09090b; // Albino ruby red on white animal, dark obsidian on black animal
    const miniSkinColor = isBlackMaze ? 0xf4b6b6 : 0x75686a; // Delicate pink on white animal, slate on black animal

    const miniFurMat = new THREE.MeshStandardMaterial({
      color: miniFurColor,
      roughness: isBlackMaze ? 0.6 : 0.45,
      metalness: isBlackMaze ? 0.02 : 0.08,
    });

    const miniSkinMat = new THREE.MeshStandardMaterial({
      color: miniSkinColor,
      roughness: 0.5,
    });

    const miniEyeMat = new THREE.MeshBasicMaterial({
      color: miniEyeColor,
    });

    // Continuous organic sculpted mini rodent body
    const miniSlices = 24;
    const miniSegs = 18;
    const miniBodyPos: number[] = [];
    const miniBodyUv: number[] = [];
    const miniBodyIdx: number[] = [];

    for (let i = 0; i <= miniSlices; i++) {
      const t = i / miniSlices;
      const cz = (0.5 * Math.pow(1 - t, 0.9) - 0.42 * Math.pow(t, 1.1)) * miniScale * 2.2;
      let cy = 0.04;
      if (t < 0.22) {
        cy = 0.04 + Math.sin((t / 0.22) * Math.PI * 0.5) * 0.08;
      } else if (t < 0.35) {
        cy = 0.12 - Math.sin(((t - 0.22) / 0.13) * Math.PI) * 0.015;
      } else if (t < 0.8) {
        const archT = (t - 0.35) / 0.45;
        cy = 0.105 + Math.sin(archT * Math.PI) * 0.14;
      } else {
        const tailT = (t - 0.8) / 0.2;
        cy = 0.105 * (1 - tailT) + 0.02 * tailT;
      }
      cy *= miniScale * 2.2;

      let rx = (0.02 + Math.sin(t * Math.PI) * 0.16) * miniScale * 2.2;
      let ry = (0.018 + Math.sin(t * Math.PI) * 0.14) * miniScale * 2.2;
      if (t > 0.65 && t < 0.88) rx *= 1.2; // haunches

      for (let j = 0; j <= miniSegs; j++) {
        const u = j / miniSegs;
        const angle = u * Math.PI * 2;
        miniBodyPos.push(rx * Math.cos(angle), cy + ry * Math.sin(angle), cz);
        miniBodyUv.push(u, t);
      }
    }

    for (let i = 0; i < miniSlices; i++) {
      for (let j = 0; j < miniSegs; j++) {
        const a = i * (miniSegs + 1) + j;
        const b = (i + 1) * (miniSegs + 1) + j;
        const c = (i + 1) * (miniSegs + 1) + (j + 1);
        const d = i * (miniSegs + 1) + (j + 1);
        miniBodyIdx.push(a, b, d);
        miniBodyIdx.push(b, c, d);
      }
    }

    const miniBodyGeo = new THREE.BufferGeometry();
    miniBodyGeo.setAttribute("position", new THREE.Float32BufferAttribute(miniBodyPos, 3));
    miniBodyGeo.setAttribute("uv", new THREE.Float32BufferAttribute(miniBodyUv, 2));
    miniBodyGeo.setIndex(miniBodyIdx);
    miniBodyGeo.computeVertexNormals();

    const miniBody = new THREE.Mesh(miniBodyGeo, miniFurMat);
    miniBody.castShadow = true;
    miniRodent.add(miniBody);

    // Pink Snout Tip
    const miniNose = new THREE.Mesh(new THREE.SphereGeometry(miniScale * 0.14, 10, 8), miniSkinMat);
    miniNose.position.set(0, miniScale * 0.25, miniScale * 1.05);
    miniRodent.add(miniNose);

    // Eyes
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(miniScale * 0.12, 10, 10), miniEyeMat);
      eye.position.set(side * (miniScale * 0.32), miniScale * 0.42, miniScale * 0.65);
      miniRodent.add(eye);
    });

    // Ears (Mice have larger round ears; Rats have smaller ears)
    const miniEarR = isRat ? miniScale * 0.35 : miniScale * 0.52;
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(miniEarR, miniEarR * 0.85, 0.015, 14), miniSkinMat);
      ear.rotation.set(Math.PI / 4, 0, side * (-Math.PI / 4));
      ear.position.set(side * (miniScale * 0.42), miniScale * 1.15, miniScale * 0.45);
      miniRodent.add(ear);
    });

    // Paws
    [-1, 1].forEach((side) => {
      const fPaw = new THREE.Mesh(new THREE.BoxGeometry(miniScale * 0.22, miniScale * 0.12, miniScale * 0.3), miniSkinMat);
      fPaw.position.set(side * (miniScale * 0.32), miniScale * 0.08, miniScale * 0.5);
      miniRodent.add(fPaw);

      const rPaw = new THREE.Mesh(new THREE.BoxGeometry(miniScale * 0.25, miniScale * 0.14, miniScale * 0.45), miniSkinMat);
      rPaw.position.set(side * (miniScale * 0.42), miniScale * 0.08, -miniScale * 0.4);
      miniRodent.add(rPaw);
    });

    // Tail trailing naturally
    const miniTailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, miniScale * 0.35, -miniScale * 0.7),
      new THREE.Vector3(miniScale * 0.3, miniScale * 0.2, -miniScale * 1.4),
      new THREE.Vector3(-miniScale * 0.2, miniScale * 0.12, -miniScale * 2.1),
    ]);
    const miniTailGeo = new THREE.TubeGeometry(miniTailCurve, 14, miniScale * 0.09, 8, false);
    const miniTail = new THREE.Mesh(miniTailGeo, miniSkinMat);
    miniRodent.add(miniTail);

    // Initial positioning inside the maze
    if (mazeType === "water_maze") {
      // Resting on escape platform
      miniRodent.position.set(1.35 * scaleFactor * 0.48, 0.55 * scaleFactor * 0.72 + 0.04, -1.35 * scaleFactor * 0.48);
    } else {
      miniRodent.position.set(0.12, 0.02, 0.2);
    }
    mazeGroup.add(miniRodent);

    // ------------------------------------------
    // 6. INTERACTIVE 360° ORBIT & TOUCH CONTROLS
    // ------------------------------------------
    let isInteracting = false;
    let prevX = 0;
    let prevY = 0;
    let targetRotY = mazeGroup.rotation.y;
    let targetRotX = 0;

    const onPointerDown = (e: PointerEvent) => {
      isInteracting = true;
      prevX = e.clientX;
      prevY = e.clientY;
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isInteracting) return;
      const deltaX = e.clientX - prevX;
      const deltaY = e.clientY - prevY;

      targetRotY += deltaX * 0.012;
      targetRotX = Math.max(-0.35, Math.min(0.55, targetRotX + deltaY * 0.008));

      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      isInteracting = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);

    // ------------------------------------------
    // 7. RENDER LOOP
    // ------------------------------------------
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Subtle mini animal breathing & tail movement
      const breath = Math.sin(elapsed * 4.0) * 0.03;
      miniBody.scale.y = 0.75 * (1 + breath);
      miniTail.rotation.y = Math.sin(elapsed * 3.0) * 0.12;

      // Auto rotation or user orbit
      if (autoRotate && !isInteracting) {
        targetRotY += 0.005;
      }

      mazeGroup.rotation.y += (targetRotY - mazeGroup.rotation.y) * 0.08;
      mazeGroup.rotation.x += (targetRotX - mazeGroup.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // ------------------------------------------
    // 8. RESIZE OBSERVER
    // ------------------------------------------
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mazeType, species, colorContrast, autoRotate]);

  return (
    <div
      ref={containerRef}
      className={`relative cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
      title="Drag to inspect 3D apparatus from any angle"
    />
  );
}