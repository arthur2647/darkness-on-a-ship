import * as THREE from 'three';

// Procedural texture generators
function createMetalTexture(color1 = '#2a2a2a', color2 = '#1a1a1a', rust = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base
  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, 256, 256);

  // Noise
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const brightness = Math.random() * 30;
    ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.3)`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }

  // Rivets
  for (let x = 32; x < 256; x += 64) {
    for (let y = 32; y < 256; y += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#444';
      ctx.fill();
    }
  }

  // Rust spots
  if (rust) {
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const r = 5 + Math.random() * 20;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(120, 60, 20, 0.4)');
      gradient.addColorStop(1, 'rgba(80, 40, 10, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  // Seam lines
  ctx.strokeStyle = color2;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 256, 256);

  // Grid pattern (metal grating)
  ctx.strokeStyle = '#252525';
  ctx.lineWidth = 3;
  for (let i = 0; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  // Wear marks
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${10 + Math.random() * 20}, ${10 + Math.random() * 15}, ${10 + Math.random() * 10}, 0.5)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 8, Math.random() * 2);
  }

  // Water stains
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 10 + Math.random() * 30;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(20, 25, 20, 0.6)');
    gradient.addColorStop(1, 'rgba(15, 15, 15, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCyrillicSign(text, width = 200, height = 60) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2a2a28';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.fillStyle = '#8b0000';
  ctx.font = `bold ${Math.floor(height * 0.5)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);

  return new THREE.CanvasTexture(canvas);
}

// Room/corridor definitions for each deck
const DECK_LAYOUTS = [
  // DECK 1 - Starting area (least scary)
  {
    name: 'DECK 1 — КАЮТЫ (Quarters)',
    corridors: [
      { pos: [0, 0, 0], size: [4, 3, 20], dir: 'z' },
      { pos: [0, 0, -20], size: [20, 3, 4], dir: 'x' },
      { pos: [10, 0, -20], size: [4, 3, 15], dir: 'z' },
    ],
    rooms: [
      { pos: [-4, 0, -5], size: [4, 3, 4], door: [-2, 0, -3], doorDir: 'x', sign: 'КАЮТА 1' },
      { pos: [4, 0, -8], size: [5, 3, 5], door: [2, 0, -6], doorDir: 'x', sign: 'КАЮТА 2' },
      { pos: [-4, 0, -14], size: [4, 3, 5], door: [-2, 0, -12], doorDir: 'x', sign: 'СКЛАД' },
    ],
    notes: [
      { pos: [-3, 1.2, -6], text: 'День 47.\nКапитан не выходил из рубки три дня. Экипаж начинает нервничать. Кто-то слышал стук из трюма.\n\nDay 47. The captain hasn\'t left the bridge in three days. The crew is getting nervous. Someone heard knocking from the hold.' },
      { pos: [5, 1.2, -9], text: 'ВНИМАНИЕ: Нижние палубы закрыты по приказу капитана.\n\nATTENTION: Lower decks sealed by captain\'s orders.\n\nDo not go below Deck 2.' },
    ],
    items: [
      { pos: [-3, 0.5, -15], type: 'battery', label: 'Battery Pack' },
    ],
    scares: [
      { pos: [10, 0, -28], type: 'shadow', triggered: false },
    ],
    stairs: { pos: [10, 0, -35], toLevel: 1 },
    light: { color: 0x331100, intensity: 0.02 },
  },
  // DECK 2 - Engine area (darker, more damp)
  {
    name: 'DECK 2 — МАШИННОЕ (Engine Room)',
    corridors: [
      { pos: [0, 0, 0], size: [3, 3.5, 25], dir: 'z' },
      { pos: [-12, 0, -12], size: [12, 3.5, 3], dir: 'x' },
      { pos: [-12, 0, -12], size: [3, 3.5, 18], dir: 'z' },
    ],
    rooms: [
      { pos: [3, 0, -6], size: [6, 3.5, 6], door: [1.5, 0, -4], doorDir: 'x', sign: 'ГЕНЕРАТОР' },
      { pos: [-15, 0, -18], size: [5, 3.5, 5], door: [-12.5, 0, -16], doorDir: 'x', sign: 'МАСТЕРСКАЯ' },
      { pos: [3, 0, -18], size: [4, 3.5, 4], door: [1.5, 0, -17], doorDir: 'x', sign: 'НАСОСНАЯ' },
    ],
    notes: [
      { pos: [5, 1.2, -8], text: 'Генератор работает на последнем. Топлива осталось на 72 часа. Если он встанет — останемся в полной темноте.\n\nGenerator running on fumes. 72 hours of fuel left. If it dies — total darkness.' },
      { pos: [-14, 1.2, -20], text: 'Я нашёл это в трюме. Это не наше. Это было здесь до нас. Маркировка... 1943? Этот корабль гораздо старше, чем нам сказали.\n\nI found this in the hold. It\'s not ours. It was here before us. Markings... 1943? This ship is much older than they told us.' },
    ],
    items: [
      { pos: [-14, 0.5, -19], type: 'key', label: 'Rusty Key (ТРЮМ)' },
      { pos: [4, 0.5, -19], type: 'battery', label: 'Battery Pack' },
    ],
    scares: [
      { pos: [-12, 0, -25], type: 'figure', triggered: false },
      { pos: [0, 0, -20], type: 'bang', triggered: false },
    ],
    stairs: { pos: [-12, 0, -30], toLevel: 2 },
    light: { color: 0x220800, intensity: 0.01 },
  },
  // DECK 3 - The Hold (deepest, scariest — escape is here)
  {
    name: 'DECK 3 — ТРЮМ (The Hold)',
    corridors: [
      { pos: [0, 0, 0], size: [3, 4, 30], dir: 'z' },
      { pos: [0, 0, -15], size: [15, 4, 3], dir: 'x' },
    ],
    rooms: [
      { pos: [-4, 0, -5], size: [4, 4, 6], door: [-2, 0, -3], doorDir: 'x', sign: 'КАРЦЕР' },
      { pos: [15, 0, -15], size: [8, 4, 8], door: [15, 0, -13.5], doorDir: 'z', sign: 'ЗАПРЕЩЕНО', locked: 'key' },
    ],
    notes: [
      { pos: [-3, 1.2, -7], text: 'Если кто-то это найдёт — не спускайтесь ниже. Мы открыли то, что должно было остаться закрытым. Оно поднимается по палубам. Оно живое.\n\nIf anyone finds this — don\'t go deeper. We opened what should have stayed sealed. It\'s rising through the decks. It\'s alive.' },
    ],
    items: [
      { pos: [19, 0.5, -18], type: 'exit', label: 'Emergency Hatch — ВЫХОД' },
    ],
    scares: [
      { pos: [0, 0, -25], type: 'chase', triggered: false },
      { pos: [-3, 0, -6], type: 'whisper', triggered: false },
    ],
    stairs: null,
    light: { color: 0x110400, intensity: 0.005 },
  },
];

export class ShipWorld {
  constructor(scene) {
    this.scene = scene;
    this.currentDeck = 0;
    this.doors = [];
    this.interactables = [];
    this.colliders = [];
    this.deckGroups = [];
    this.wallTex = createMetalTexture();
    this.floorTex = createFloorTexture();
    this.wallTex.repeat.set(2, 1);
    this.floorTex.repeat.set(4, 4);
    this.inventory = { keys: [], batteries: 0 };

    this.buildAllDecks();
    this.showDeck(0);
  }

  buildAllDecks() {
    DECK_LAYOUTS.forEach((layout, i) => {
      const group = new THREE.Group();
      group.visible = false;
      group.userData.deckIndex = i;

      // Ambient light for deck
      const ambient = new THREE.AmbientLight(layout.light.color, layout.light.intensity);
      group.add(ambient);

      // Build corridors
      layout.corridors.forEach(c => this.buildCorridor(group, c));

      // Build rooms
      layout.rooms.forEach(r => this.buildRoom(group, r, i));

      // Add notes
      layout.notes.forEach(n => this.addNote(group, n, i));

      // Add items
      layout.items.forEach(item => this.addItem(group, item, i));

      // Add stairs to next level
      if (layout.stairs) {
        this.addStairs(group, layout.stairs, i);
      }

      // Store scare data
      group.userData.scares = layout.scares.map(s => ({ ...s, triggered: false }));

      this.scene.add(group);
      this.deckGroups.push(group);
    });
  }

  buildCorridor(group, corridor) {
    const [cx, cy, cz] = corridor.pos;
    const [w, h, d] = corridor.size;

    const wallMat = new THREE.MeshStandardMaterial({
      map: this.wallTex.clone(),
      roughness: 0.9,
      metalness: 0.3,
      color: 0x333333,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTex.clone(),
      roughness: 0.95,
      metalness: 0.2,
      color: 0x222222,
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 1,
      metalness: 0.1,
    });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, cy, cz - d / 2);
    group.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(cx, cy + h, cz - d / 2);
    group.add(ceiling);

    // Walls
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(cx - w / 2, cy + h / 2, cz - d / 2);
    group.add(leftWall);
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(cx - w / 2, cy + h / 2, cz - d / 2),
      new THREE.Vector3(0.2, h, d)
    ));

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat.clone());
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(cx + w / 2, cy + h / 2, cz - d / 2);
    group.add(rightWall);
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(cx + w / 2, cy + h / 2, cz - d / 2),
      new THREE.Vector3(0.2, h, d)
    ));

    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat.clone());
    backWall.position.set(cx, cy + h / 2, cz - d);
    group.add(backWall);
    this.colliders.push(new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(cx, cy + h / 2, cz - d),
      new THREE.Vector3(w, h, 0.2)
    ));

    // Front wall
    const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat.clone());
    frontWall.rotation.y = Math.PI;
    frontWall.position.set(cx, cy + h / 2, cz);
    group.add(frontWall);

    // Pipes on ceiling
    this.addPipes(group, cx, cy + h - 0.15, cz, d, corridor.dir);
  }

  addPipes(group, x, y, z, length, dir) {
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a2a,
      roughness: 0.7,
      metalness: 0.5,
    });

    for (let i = 0; i < 2; i++) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, length, 6),
        pipeMat
      );
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

  buildRoom(group, room, deckIndex) {
    const [rx, ry, rz] = room.pos;
    const [w, h, d] = room.size;

    const wallMat = new THREE.MeshStandardMaterial({
      map: this.wallTex.clone(),
      roughness: 0.9,
      metalness: 0.3,
      color: 0x2a2a2a,
    });

    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTex.clone(),
      roughness: 0.95,
      color: 0x1a1a1a,
    });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(rx - w / 2, ry, rz - d / 2);
    group.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(rx - w / 2, ry + h, rz - d / 2);
    group.add(ceil);

    // 4 walls
    const walls = [
      { pos: [rx - w, ry + h / 2, rz - d / 2], rot: [0, Math.PI / 2, 0], size: [d, h] },
      { pos: [rx, ry + h / 2, rz - d / 2], rot: [0, -Math.PI / 2, 0], size: [d, h] },
      { pos: [rx - w / 2, ry + h / 2, rz], rot: [0, Math.PI, 0], size: [w, h] },
      { pos: [rx - w / 2, ry + h / 2, rz - d], rot: [0, 0, 0], size: [w, h] },
    ];

    walls.forEach(wall => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...wall.size), wallMat.clone());
      mesh.position.set(...wall.pos);
      mesh.rotation.set(...wall.rot);
      group.add(mesh);
    });

    // Door
    if (room.door) {
      const [dx, dy, dz] = room.door;
      const doorMat = new THREE.MeshStandardMaterial({
        color: 0x444433,
        roughness: 0.8,
        metalness: 0.4,
      });
      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.1), doorMat);
      doorMesh.position.set(dx, dy + 1.2, dz);
      if (room.doorDir === 'x') {
        doorMesh.rotation.y = Math.PI / 2;
      }
      doorMesh.userData.isDoor = true;
      doorMesh.userData.isOpen = false;
      doorMesh.userData.locked = room.locked || false;
      doorMesh.userData.openRotation = Math.PI / 2;
      doorMesh.userData.deckIndex = deckIndex;
      group.add(doorMesh);
      this.doors.push(doorMesh);

      // Sign above door
      if (room.sign) {
        const signTex = createCyrillicSign(room.sign);
        const signMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(1.0, 0.3),
          new THREE.MeshStandardMaterial({ map: signTex, emissive: 0x220000, emissiveIntensity: 0.3 })
        );
        signMesh.position.set(dx, dy + 2.6, dz);
        if (room.doorDir === 'x') {
          signMesh.rotation.y = Math.PI / 2;
        }
        group.add(signMesh);
      }
    }
  }

  addNote(group, note, deckIndex) {
    const noteMat = new THREE.MeshStandardMaterial({
      color: 0xc8b88a,
      emissive: 0x221100,
      emissiveIntensity: 0.1,
      roughness: 1,
    });
    const noteMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), noteMat);
    noteMesh.position.set(...note.pos);
    noteMesh.rotation.y = Math.random() * 0.5 - 0.25;
    noteMesh.userData.isNote = true;
    noteMesh.userData.text = note.text;
    noteMesh.userData.deckIndex = deckIndex;
    group.add(noteMesh);
    this.interactables.push(noteMesh);
  }

  addItem(group, item, deckIndex) {
    let geo, mat;
    if (item.type === 'battery') {
      geo = new THREE.BoxGeometry(0.15, 0.08, 0.3);
      mat = new THREE.MeshStandardMaterial({
        color: 0x44aa44,
        emissive: 0x114411,
        emissiveIntensity: 0.3,
      });
    } else if (item.type === 'key') {
      geo = new THREE.BoxGeometry(0.05, 0.15, 0.05);
      mat = new THREE.MeshStandardMaterial({
        color: 0xaa8833,
        emissive: 0x332200,
        emissiveIntensity: 0.3,
        metalness: 0.8,
      });
    } else if (item.type === 'exit') {
      geo = new THREE.BoxGeometry(1.5, 2.2, 0.15);
      mat = new THREE.MeshStandardMaterial({
        color: 0x883333,
        emissive: 0x440000,
        emissiveIntensity: 0.5,
      });
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

  addStairs(group, stairs, deckIndex) {
    const stairMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.5,
    });

    // Stairwell opening - glowing indicator
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.05, 2),
      new THREE.MeshStandardMaterial({
        color: 0x882200,
        emissive: 0x661100,
        emissiveIntensity: 0.4,
      })
    );
    marker.position.set(stairs.pos[0], stairs.pos[1], stairs.pos[2]);
    group.add(marker);

    // Sign
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
    this.deckGroups.forEach((g, i) => {
      g.visible = i === index;
    });
    this.currentDeck = index;
  }

  getDeckLayout() {
    return DECK_LAYOUTS[this.currentDeck];
  }

  getScares() {
    return this.deckGroups[this.currentDeck]?.userData.scares || [];
  }

  getSpawnPoint() {
    return new THREE.Vector3(0, 1.6, -2);
  }
}
