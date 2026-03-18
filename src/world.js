import * as THREE from 'three';

// ==================== PROCEDURAL TEXTURES ====================

function createMetalTexture(color1 = '#2a2a2a', color2 = '#1a1a1a', rust = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256, y = Math.random() * 256;
    const b = Math.random() * 30;
    ctx.fillStyle = `rgba(${b},${b},${b},0.3)`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let x = 32; x < 256; x += 64) {
    for (let y = 32; y < 256; y += 64) {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#333'; ctx.fill();
      ctx.beginPath(); ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2); ctx.fillStyle = '#444'; ctx.fill();
    }
  }
  if (rust) {
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 5 + Math.random() * 20;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(120,60,20,0.4)'); g.addColorStop(1, 'rgba(80,40,10,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }
  ctx.strokeStyle = color2; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(256, 128); ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#252525'; ctx.lineWidth = 3;
  for (let i = 0; i < 256; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${10 + Math.random() * 20},${10 + Math.random() * 15},${10 + Math.random() * 10},0.5)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 8, Math.random() * 2);
  }
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 10 + Math.random() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(20,25,20,0.6)'); g.addColorStop(1, 'rgba(15,15,15,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCyrillicSign(text, width = 200, height = 60) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2a2a28'; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.strokeRect(2, 2, width - 4, height - 4);
  ctx.fillStyle = '#8b0000';
  ctx.font = `bold ${Math.floor(height * 0.5)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  return new THREE.CanvasTexture(canvas);
}

// ==================== WALL SEGMENT BUILDER ====================
// Builds wall planes along an axis, with gaps for openings (doorways/connections)
// runAxis: 'x' = wall runs along x (north/south walls), 'z' = wall runs along z (east/west walls)
// normalDir: +1 or -1 controls which side the wall faces
//   For runAxis='x': +1 = face +z, -1 = face -z
//   For runAxis='z': +1 = face +x, -1 = face -x

function buildWallSegments(group, config) {
  const { runAxis, runStart, runEnd, fixedPos, y, h, normalDir, material, openings = [] } = config;

  // Sort openings and compute solid wall segments
  const sorted = [...openings].sort((a, b) => a.from - b.from);
  const segments = [];
  let cur = runStart;
  for (const op of sorted) {
    if (op.from > cur) segments.push({ from: cur, to: op.from });
    cur = Math.max(cur, op.to);
  }
  if (cur < runEnd) segments.push({ from: cur, to: runEnd });

  const colliders = [];
  for (const seg of segments) {
    const len = seg.to - seg.from;
    if (len < 0.05) continue;
    const mid = (seg.from + seg.to) / 2;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, h), material.clone());

    if (runAxis === 'x') {
      mesh.position.set(mid, y + h / 2, fixedPos);
      mesh.rotation.y = normalDir > 0 ? 0 : Math.PI;
      colliders.push(new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(mid, y + h / 2, fixedPos),
        new THREE.Vector3(len, h, 0.3)
      ));
    } else {
      mesh.position.set(fixedPos, y + h / 2, mid);
      mesh.rotation.y = normalDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      colliders.push(new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(fixedPos, y + h / 2, mid),
        new THREE.Vector3(0.3, h, len)
      ));
    }

    group.add(mesh);
  }
  return colliders;
}

// Build a rectangular space with floor, ceiling, and 4 walls (each with optional openings)
function buildSpace(group, config, wallMat, floorMat, ceilMat) {
  const { x1, x2, z1, z2, y = 0, h = 3,
    nOpen = [], sOpen = [], eOpen = [], wOpen = [] } = config;

  const xMin = Math.min(x1, x2), xMax = Math.max(x1, x2);
  const zMin = Math.min(z1, z2), zMax = Math.max(z1, z2);
  const w = xMax - xMin, d = zMax - zMin;
  const cx = (xMin + xMax) / 2, cz = (zMin + zMax) / 2;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat.clone());
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, y, cz);
  group.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat.clone());
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, y + h, cz);
  group.add(ceil);

  const colliders = [];

  // North wall (z=zMax, face inward = -z)
  colliders.push(...buildWallSegments(group, {
    runAxis: 'x', runStart: xMin, runEnd: xMax, fixedPos: zMax,
    y, h, normalDir: -1, material: wallMat, openings: nOpen
  }));
  // South wall (z=zMin, face inward = +z)
  colliders.push(...buildWallSegments(group, {
    runAxis: 'x', runStart: xMin, runEnd: xMax, fixedPos: zMin,
    y, h, normalDir: 1, material: wallMat, openings: sOpen
  }));
  // East wall (x=xMax, face inward = -x)
  colliders.push(...buildWallSegments(group, {
    runAxis: 'z', runStart: zMin, runEnd: zMax, fixedPos: xMax,
    y, h, normalDir: -1, material: wallMat, openings: eOpen
  }));
  // West wall (x=xMin, face inward = +x)
  colliders.push(...buildWallSegments(group, {
    runAxis: 'z', runStart: zMin, runEnd: zMax, fixedPos: xMin,
    y, h, normalDir: 1, material: wallMat, openings: wOpen
  }));

  return colliders;
}

// ==================== PIPES ====================

function addPipes(group, x, y, z, length, dir) {
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x6a6a5a, roughness: 0.7, metalness: 0.5 });
  for (let i = 0; i < 2; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, length, 6), pipeMat);
    if (dir === 'z') {
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(x + (i === 0 ? -0.8 : 0.8), y, z - length / 2);
    } else {
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(x + length / 2, y, z + (i === 0 ? -0.8 : 0.8));
    }
    group.add(pipe);
  }
}

// ==================== DECK DEFINITIONS ====================
// Each space defines a rectangular area with openings on its walls.
// Openings are {from, to} ranges in the wall's running axis coordinate.
// Matching openings on adjacent spaces create walkable connections.

const DECK_DEFS = [
  // ==================== DECK 1 — КАЮТЫ (Quarters) ====================
  {
    name: 'DECK 1 — КАЮТЫ (Quarters)',
    h: 3,
    ambient: { color: 0x443322, intensity: 0.15 },
    spaces: [
      // Main corridor: x[-2,2] z[0,-20]
      { x1: -2, x2: 2, z1: 0, z2: -20,
        wOpen: [{ from: -7, to: -5 }, { from: -15, to: -13 }],
        eOpen: [{ from: -10, to: -8 }],
        sOpen: [{ from: -2, to: 2 }],
      },
      // Junction: x[-2,12] z[-20,-24]
      { x1: -2, x2: 12, z1: -20, z2: -24,
        nOpen: [{ from: -2, to: 2 }],
        sOpen: [{ from: 8, to: 12 }],
      },
      // South corridor: x[8,12] z[-24,-36]
      { x1: 8, x2: 12, z1: -24, z2: -36,
        nOpen: [{ from: 8, to: 12 }],
      },
      // Room 1 — КАЮТА 1: x[-6,-2] z[-4,-8]
      { x1: -6, x2: -2, z1: -4, z2: -8,
        eOpen: [{ from: -7, to: -5 }],
      },
      // Room 2 — КАЮТА 2: x[2,7] z[-7,-12]
      { x1: 2, x2: 7, z1: -7, z2: -12,
        wOpen: [{ from: -10, to: -8 }],
      },
      // Room 3 — СКЛАД: x[-6,-2] z[-12,-17]
      { x1: -6, x2: -2, z1: -12, z2: -17,
        eOpen: [{ from: -15, to: -13 }],
      },
    ],
    doors: [
      { x: -2, z: -6, wallAxis: 'z', sign: 'КАЮТА 1' },
      { x: 2, z: -9, wallAxis: 'z', sign: 'КАЮТА 2' },
      { x: -2, z: -14, wallAxis: 'z', sign: 'СКЛАД' },
    ],
    notes: [
      { pos: [-4, 1.2, -6], text: 'День 47.\nКапитан не выходил из рубки три дня. Экипаж начинает нервничать. Кто-то слышал стук из трюма.\n\nDay 47. The captain hasn\'t left the bridge in three days. The crew is getting nervous. Someone heard knocking from the hold.' },
      { pos: [4.5, 1.2, -9.5], text: 'ВНИМАНИЕ: Нижние палубы закрыты по приказу капитана.\n\nATTENTION: Lower decks sealed by captain\'s orders.\n\nDo not go below Deck 2.' },
    ],
    items: [
      { pos: [-4, 0.5, -15], type: 'battery', label: 'Battery Pack' },
    ],
    scares: [
      { pos: [10, 0, -30], type: 'shadow' },
    ],
    stairs: { pos: [10, 0, -35], toLevel: 1 },
  },

  // ==================== DECK 2 — МАШИННОЕ (Engine Room) ====================
  {
    name: 'DECK 2 — МАШИННОЕ (Engine Room)',
    h: 3.5,
    ambient: { color: 0x332211, intensity: 0.08 },
    spaces: [
      // Main corridor: x[-1.5,1.5] z[0,-22]
      { x1: -1.5, x2: 1.5, z1: 0, z2: -22,
        wOpen: [{ from: -13, to: -10 }],
        eOpen: [{ from: -7, to: -5 }, { from: -18, to: -16 }],
      },
      // Cross corridor: x[-12,-1.5] z[-10,-13]
      { x1: -12, x2: -1.5, z1: -10, z2: -13,
        eOpen: [{ from: -13, to: -10 }],
        sOpen: [{ from: -12, to: -9 }],
      },
      // South corridor: x[-12,-9] z[-13,-30]
      { x1: -12, x2: -9, z1: -13, z2: -30,
        nOpen: [{ from: -12, to: -9 }],
        wOpen: [{ from: -20, to: -18 }],
      },
      // Generator room: x[1.5,7.5] z[-4,-10]
      { x1: 1.5, x2: 7.5, z1: -4, z2: -10,
        wOpen: [{ from: -7, to: -5 }],
      },
      // Workshop: x[-16,-12] z[-17,-22]
      { x1: -16, x2: -12, z1: -17, z2: -22,
        eOpen: [{ from: -20, to: -18 }],
      },
      // Pump room: x[1.5,5.5] z[-15,-19]
      { x1: 1.5, x2: 5.5, z1: -15, z2: -19,
        wOpen: [{ from: -18, to: -16 }],
      },
    ],
    doors: [
      { x: 1.5, z: -6, wallAxis: 'z', sign: 'ГЕНЕРАТОР' },
      { x: -12, z: -19, wallAxis: 'z', sign: 'МАСТЕРСКАЯ' },
      { x: 1.5, z: -17, wallAxis: 'z', sign: 'НАСОСНАЯ' },
    ],
    notes: [
      { pos: [4.5, 1.2, -7], text: 'Генератор работает на последнем. Топлива осталось на 72 часа. Если он встанет — останемся в полной темноте.\n\nGenerator running on fumes. 72 hours of fuel left. If it dies — total darkness.' },
      { pos: [-14, 1.2, -20], text: 'Я нашёл это в трюме. Это не наше. Это было здесь до нас. Маркировка... 1943? Этот корабль гораздо старше, чем нам сказали.\n\nI found this in the hold. It\'s not ours. It was here before us. Markings... 1943? This ship is much older than they told us.' },
    ],
    items: [
      { pos: [-14, 0.5, -19], type: 'key', label: 'Rusty Key (ТРЮМ)' },
      { pos: [3.5, 0.5, -17], type: 'battery', label: 'Battery Pack' },
    ],
    scares: [
      { pos: [-10.5, 0, -25], type: 'figure' },
      { pos: [0, 0, -18], type: 'bang' },
    ],
    stairs: { pos: [-10.5, 0, -29], toLevel: 2 },
  },

  // ==================== DECK 3 — ТРЮМ (The Hold) ====================
  {
    name: 'DECK 3 — ТРЮМ (The Hold)',
    h: 4,
    ambient: { color: 0x221100, intensity: 0.04 },
    spaces: [
      // Main corridor: x[-1.5,1.5] z[0,-25]
      { x1: -1.5, x2: 1.5, z1: 0, z2: -25,
        wOpen: [{ from: -7, to: -4 }],
        eOpen: [{ from: -15, to: -12 }],
      },
      // Cell (КАРЦЕР): x[-5.5,-1.5] z[-3,-9]
      { x1: -5.5, x2: -1.5, z1: -3, z2: -9,
        eOpen: [{ from: -7, to: -4 }],
      },
      // Cross corridor: x[1.5,17] z[-12,-16]
      { x1: 1.5, x2: 17, z1: -12, z2: -16,
        wOpen: [{ from: -15, to: -12 }],
        eOpen: [{ from: -15, to: -13 }],
      },
      // Forbidden room (ЗАПРЕЩЕНО): x[17,24] z[-11,-20]
      { x1: 17, x2: 24, z1: -11, z2: -20,
        wOpen: [{ from: -15, to: -13 }],
      },
    ],
    doors: [
      { x: -1.5, z: -5.5, wallAxis: 'z', sign: 'КАРЦЕР' },
      { x: 17, z: -14, wallAxis: 'z', sign: 'ЗАПРЕЩЕНО', locked: true },
    ],
    notes: [
      { pos: [-3.5, 1.2, -6], text: 'Если кто-то это найдёт — не спускайтесь ниже. Мы открыли то, что должно было остаться закрытым. Оно поднимается по палубам. Оно живое.\n\nIf anyone finds this — don\'t go deeper. We opened what should have stayed sealed. It\'s rising through the decks. It\'s alive.' },
    ],
    items: [
      { pos: [20.5, 0.5, -17], type: 'exit', label: 'Emergency Hatch — ВЫХОД' },
    ],
    scares: [
      { pos: [0, 0, -20], type: 'chase' },
      { pos: [-3.5, 0, -6], type: 'whisper' },
    ],
    stairs: null,
  },
];

// ==================== SHIP WORLD CLASS ====================

export class ShipWorld {
  constructor(scene) {
    this.scene = scene;
    this.currentDeck = 0;
    this.doors = [];
    this.interactables = [];
    this.deckColliders = [];
    this.deckGroups = [];
    this.wallTex = createMetalTexture();
    this.floorTex = createFloorTexture();
    this.wallTex.repeat.set(2, 1);
    this.floorTex.repeat.set(4, 4);
    this.buildAllDecks();
    this.showDeck(0);
  }

  buildAllDecks() {
    DECK_DEFS.forEach((deck, i) => {
      const group = new THREE.Group();
      group.visible = false;

      const ambient = new THREE.AmbientLight(deck.ambient.color, deck.ambient.intensity);
      group.add(ambient);

      const wallMat = new THREE.MeshStandardMaterial({
        map: this.wallTex.clone(), roughness: 0.85, metalness: 0.2, color: 0x888888,
      });
      const floorMat = new THREE.MeshStandardMaterial({
        map: this.floorTex.clone(), roughness: 0.9, metalness: 0.15, color: 0x666666,
      });
      const ceilMat = new THREE.MeshStandardMaterial({
        color: 0x555555, roughness: 0.95, metalness: 0.1,
      });

      const colliders = [];

      // Build all spaces
      deck.spaces.forEach(space => {
        const c = buildSpace(group, { ...space, h: deck.h }, wallMat, floorMat, ceilMat);
        colliders.push(...c);
      });

      // Add pipes along first corridor of each deck
      const firstSpace = deck.spaces[0];
      const pipeY = deck.h - 0.15;
      const pipeZ = (firstSpace.z1 + firstSpace.z2) / 2;
      const pipeLen = Math.abs(firstSpace.z1 - firstSpace.z2);
      addPipes(group, (firstSpace.x1 + firstSpace.x2) / 2, pipeY, firstSpace.z1, pipeLen, 'z');

      // Place doors
      deck.doors.forEach(d => this.placeDoor(group, d, i, deck.h));

      // Place notes
      deck.notes.forEach(n => this.placeNote(group, n, i));

      // Place items
      deck.items.forEach(item => this.placeItem(group, item, i));

      // Place stairs
      if (deck.stairs) this.placeStairs(group, deck.stairs, i);

      // Add some dim emergency lights in corridors
      deck.spaces.slice(0, 3).forEach(space => {
        const lx = (space.x1 + space.x2) / 2;
        const lz = (space.z1 + space.z2) / 2;
        const eLight = new THREE.PointLight(0x881100, 0.3, 8);
        eLight.position.set(lx, deck.h - 0.3, lz);
        group.add(eLight);
      });

      group.userData.scares = (deck.scares || []).map(s => ({ ...s, triggered: false }));

      this.scene.add(group);
      this.deckGroups.push(group);
      this.deckColliders.push(colliders);
    });
  }

  placeDoor(group, config, deckIndex, h) {
    const { x, z, wallAxis, sign, locked } = config;
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x887766, roughness: 0.75, metalness: 0.4,
    });

    const doorW = 1.8;
    const pivot = new THREE.Group();
    let doorMesh;

    if (wallAxis === 'z') {
      // Wall runs along Z at fixed x. Door is thin in X, wide in Z.
      doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, doorW), doorMat);
      pivot.position.set(x, 0, z - doorW / 2);
      doorMesh.position.set(0, 1.2, doorW / 2);
    } else {
      // Wall runs along X at fixed z. Door is wide in X, thin in Z.
      doorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, 2.4, 0.08), doorMat);
      pivot.position.set(x - doorW / 2, 0, z);
      doorMesh.position.set(doorW / 2, 1.2, 0);
    }

    pivot.add(doorMesh);
    group.add(pivot);

    doorMesh.userData.isDoor = true;
    doorMesh.userData.isOpen = false;
    doorMesh.userData.locked = locked || false;
    doorMesh.userData.deckIndex = deckIndex;
    doorMesh.userData.pivot = pivot;
    doorMesh.userData.closedRotation = 0;
    doorMesh.userData.openedRotation = Math.PI / 2;
    this.doors.push(doorMesh);

    if (sign) {
      const signTex = createCyrillicSign(sign);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 0.3),
        new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x220000, emissiveIntensity: 0.3 })
      );
      // Offset sign slightly from wall to prevent z-fighting
      if (wallAxis === 'z') {
        signMesh.position.set(x + 0.05, 2.7, z);
        signMesh.rotation.y = Math.PI / 2;
      } else {
        signMesh.position.set(x, 2.7, z + 0.05);
      }
      group.add(signMesh);
    }
  }

  placeNote(group, note, deckIndex) {
    const noteMat = new THREE.MeshStandardMaterial({
      color: 0xc8b88a, emissive: 0x221100, emissiveIntensity: 0.1, roughness: 1,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), noteMat);
    mesh.position.set(...note.pos);
    mesh.rotation.y = Math.random() * 0.5 - 0.25;
    mesh.userData.isNote = true;
    mesh.userData.text = note.text;
    mesh.userData.deckIndex = deckIndex;
    group.add(mesh);
    this.interactables.push(mesh);
  }

  placeItem(group, item, deckIndex) {
    let geo, mat;
    if (item.type === 'battery') {
      geo = new THREE.BoxGeometry(0.15, 0.08, 0.3);
      mat = new THREE.MeshStandardMaterial({ color: 0x44aa44, emissive: 0x114411, emissiveIntensity: 0.3 });
    } else if (item.type === 'key') {
      geo = new THREE.BoxGeometry(0.05, 0.15, 0.05);
      mat = new THREE.MeshStandardMaterial({ color: 0xaa8833, emissive: 0x332200, emissiveIntensity: 0.3, metalness: 0.8 });
    } else if (item.type === 'exit') {
      geo = new THREE.BoxGeometry(1.5, 2.2, 0.15);
      mat = new THREE.MeshStandardMaterial({ color: 0x883333, emissive: 0x440000, emissiveIntensity: 0.5 });
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...item.pos);
    mesh.userData.isItem = true;
    mesh.userData.itemType = item.type;
    mesh.userData.label = item.label;
    mesh.userData.deckIndex = deckIndex;
    group.add(mesh);
    this.interactables.push(mesh);
  }

  placeStairs(group, stairs, deckIndex) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.05, 2),
      new THREE.MeshStandardMaterial({ color: 0x882200, emissive: 0x661100, emissiveIntensity: 0.4 })
    );
    marker.position.set(stairs.pos[0], stairs.pos[1], stairs.pos[2]);
    group.add(marker);

    const signTex = createCyrillicSign('ВНИЗ ↓', 150, 40);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.2),
      new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x330000, emissiveIntensity: 0.5 })
    );
    sign.position.set(stairs.pos[0], stairs.pos[1] + 2.5, stairs.pos[2] + 1);
    group.add(sign);

    marker.userData.isStairs = true;
    marker.userData.toLevel = stairs.toLevel;
    marker.userData.deckIndex = deckIndex;
    this.interactables.push(marker);
  }

  showDeck(index) {
    this.deckGroups.forEach((g, i) => { g.visible = i === index; });
    this.currentDeck = index;
  }

  getDeckLayout() {
    return DECK_DEFS[this.currentDeck];
  }

  getScares() {
    return this.deckGroups[this.currentDeck]?.userData.scares || [];
  }

  getColliders() {
    return this.deckColliders[this.currentDeck] || [];
  }

  getSpawnPoint() {
    return new THREE.Vector3(0, 1.6, -2);
  }
}
