import * as THREE from 'three';
import { ShipWorld } from './world.js';
import { AudioManager } from './audio.js';

// ==================== MOBILE DETECTION ====================
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  || (navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches);

// ==================== GAME STATE ====================
const state = {
  playing: false,
  flashlightOn: true,
  battery: 100,
  batteryDrain: 1.5,
  moveSpeed: 3.5,
  lookSensitivity: 0.002,
  touchLookSensitivity: 0.004,
  currentDeck: 0,
  readingNote: false,
  hasKey: false,
  won: false,
  footstepTimer: 0,
  footstepInterval: 0.45,
  velocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  euler: new THREE.Euler(0, 0, 0, 'YXZ'),
  keys: {},
  scareActive: false,
  scareCooldown: 0,
  // Mobile touch state
  joystickActive: false,
  joystickX: 0,
  joystickY: 0,
  lookTouchId: null,
  lookTouchStartX: 0,
  lookTouchStartY: 0,
};

// ==================== SCENE SETUP ====================
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = !isMobile;
if (!isMobile) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.06);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50);
camera.position.set(0, 1.6, -2);

// ==================== FLASHLIGHT ====================
const flashlight = new THREE.SpotLight(0xfff5e0, 30, 30, Math.PI / 5, 0.4, 1);
if (!isMobile) {
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(512, 512);
}
camera.add(flashlight);
flashlight.position.set(0.3, -0.2, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight.target);

const playerAmbient = new THREE.PointLight(0x223344, 0.4, 5);
camera.add(playerAmbient);
scene.add(camera);

// ==================== WORLD ====================
const world = new ShipWorld(scene);
const audio = new AudioManager();

// ==================== RAYCASTER ====================
const raycaster = new THREE.Raycaster();
raycaster.far = 4;
const interactionRay = new THREE.Vector2(0, 0);

// ==================== DOM ELEMENTS ====================
const blocker = document.getElementById('blocker');
const hud = document.getElementById('hud');
const batteryFill = document.getElementById('battery-fill');
const depthIndicator = document.getElementById('depth-indicator');
const interactionPrompt = document.getElementById('interaction-prompt');
const noteOverlay = document.getElementById('note-overlay');
const noteContent = document.getElementById('note-content');
const jumpScareOverlay = document.getElementById('jump-scare-overlay');
const deathScreen = document.getElementById('death-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Mobile elements
const joystickZone = document.getElementById('joystick-zone');
const joystickBase = document.getElementById('joystick-base');
const joystickThumb = document.getElementById('joystick-thumb');
const btnInteract = document.getElementById('btn-interact');
const btnFlashlight = document.getElementById('btn-flashlight');

// ==================== START GAME ====================
function startGame() {
  audio.init();
  if (isMobile) {
    state.playing = true;
    blocker.style.display = 'none';
    hud.style.display = 'block';
  } else {
    document.body.requestPointerLock();
  }
}

startBtn.addEventListener('click', startGame);
startBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  startGame();
});

restartBtn.addEventListener('click', () => location.reload());
restartBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  location.reload();
});

// ==================== POINTER LOCK (DESKTOP) ====================
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) {
    state.playing = true;
    blocker.style.display = 'none';
    hud.style.display = 'block';
  } else if (!isMobile) {
    if (!state.won && !state.readingNote) {
      state.playing = false;
      blocker.style.display = 'flex';
      hud.style.display = 'none';
    }
  }
});

// ==================== MOUSE LOOK (DESKTOP) ====================
document.addEventListener('mousemove', (e) => {
  if (!state.playing || state.readingNote || isMobile) return;
  state.euler.setFromQuaternion(camera.quaternion);
  state.euler.y -= e.movementX * state.lookSensitivity;
  state.euler.x -= e.movementY * state.lookSensitivity;
  state.euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, state.euler.x));
  camera.quaternion.setFromEuler(state.euler);
});

// ==================== KEYBOARD (DESKTOP) ====================
document.addEventListener('keydown', (e) => {
  state.keys[e.code] = true;
  if (e.code === 'KeyF' && state.playing) state.flashlightOn = !state.flashlightOn;
  if (e.code === 'KeyE' && state.playing) handleInteraction();
});

document.addEventListener('keyup', (e) => {
  state.keys[e.code] = false;
});

// ==================== MOBILE TOUCH CONTROLS ====================
if (isMobile) {
  let joystickTouchId = null;
  let joystickCenterX = 0;
  let joystickCenterY = 0;
  const joystickMaxRadius = 45;

  // Joystick
  joystickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    const rect = joystickBase.getBoundingClientRect();
    joystickCenterX = rect.left + rect.width / 2;
    joystickCenterY = rect.top + rect.height / 2;
    state.joystickActive = true;
  }, { passive: false });

  joystickZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) {
        let dx = touch.clientX - joystickCenterX;
        let dy = touch.clientY - joystickCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > joystickMaxRadius) {
          dx = (dx / dist) * joystickMaxRadius;
          dy = (dy / dist) * joystickMaxRadius;
        }
        joystickThumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        state.joystickX = dx / joystickMaxRadius;
        state.joystickY = dy / joystickMaxRadius;
      }
    }
  }, { passive: false });

  const resetJoystick = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joystickTouchId) {
        joystickTouchId = null;
        state.joystickActive = false;
        state.joystickX = 0;
        state.joystickY = 0;
        joystickThumb.style.transform = 'translate(-50%, -50%)';
      }
    }
  };
  joystickZone.addEventListener('touchend', resetJoystick, { passive: false });
  joystickZone.addEventListener('touchcancel', resetJoystick, { passive: false });

  // Look — touch on the right half of screen (not on buttons/joystick)
  renderer.domElement.addEventListener('touchstart', (e) => {
    if (!state.playing) return;
    for (const touch of e.changedTouches) {
      // Only use touches on right half for look
      if (touch.clientX > window.innerWidth * 0.35 && state.lookTouchId === null) {
        state.lookTouchId = touch.identifier;
        state.lookTouchStartX = touch.clientX;
        state.lookTouchStartY = touch.clientY;
      }
    }
  }, { passive: true });

  renderer.domElement.addEventListener('touchmove', (e) => {
    if (!state.playing || state.readingNote) return;
    for (const touch of e.changedTouches) {
      if (touch.identifier === state.lookTouchId) {
        const dx = touch.clientX - state.lookTouchStartX;
        const dy = touch.clientY - state.lookTouchStartY;
        state.lookTouchStartX = touch.clientX;
        state.lookTouchStartY = touch.clientY;

        state.euler.setFromQuaternion(camera.quaternion);
        state.euler.y -= dx * state.touchLookSensitivity;
        state.euler.x -= dy * state.touchLookSensitivity;
        state.euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, state.euler.x));
        camera.quaternion.setFromEuler(state.euler);
      }
    }
  }, { passive: true });

  const resetLookTouch = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === state.lookTouchId) {
        state.lookTouchId = null;
      }
    }
  };
  renderer.domElement.addEventListener('touchend', resetLookTouch, { passive: true });
  renderer.domElement.addEventListener('touchcancel', resetLookTouch, { passive: true });

  // Action buttons
  btnInteract.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.playing) handleInteraction();
  }, { passive: false });

  btnFlashlight.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.playing) state.flashlightOn = !state.flashlightOn;
  }, { passive: false });

  // Tap note overlay to close
  noteOverlay.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (state.readingNote) {
      state.readingNote = false;
      noteOverlay.style.display = 'none';
    }
  }, { passive: false });
}

// ==================== INTERACTION ====================
function handleInteraction() {
  if (state.readingNote) {
    state.readingNote = false;
    noteOverlay.style.display = 'none';
    return;
  }

  raycaster.setFromCamera(interactionRay, camera);

  const doorHits = raycaster.intersectObjects(world.doors.filter(d => d.userData.deckIndex === state.currentDeck));
  if (doorHits.length > 0) {
    const door = doorHits[0].object;
    if (door.userData.locked && !state.hasKey) {
      showPrompt('Locked — need key (КЛЮЧ)', 2000);
      return;
    }
    if (!door.userData.isOpen) {
      door.userData.isOpen = true;
      door.userData.locked = false;
      const targetRot = door.rotation.y + door.userData.openRotation;
      const startRot = door.rotation.y;
      const startTime = performance.now();
      const animateDoor = (now) => {
        const t = Math.min((now - startTime) / 800, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        door.rotation.y = startRot + (targetRot - startRot) * ease;
        if (t < 1) requestAnimationFrame(animateDoor);
      };
      requestAnimationFrame(animateDoor);
      audio.playDoorOpen();
    }
    return;
  }

  const hits = raycaster.intersectObjects(
    world.interactables.filter(i => i.userData.deckIndex === state.currentDeck)
  );
  if (hits.length > 0) {
    const obj = hits[0].object;

    if (obj.userData.isNote) {
      state.readingNote = true;
      noteContent.textContent = obj.userData.text;
      noteOverlay.style.display = 'block';
      return;
    }

    if (obj.userData.isItem) {
      if (obj.userData.itemType === 'battery') {
        state.battery = Math.min(100, state.battery + 40);
        audio.playPickup();
        showPrompt('Picked up: ' + obj.userData.label, 2000);
        obj.visible = false;
        obj.userData.deckIndex = -1;
      } else if (obj.userData.itemType === 'key') {
        state.hasKey = true;
        audio.playPickup();
        showPrompt('Picked up: ' + obj.userData.label, 2000);
        obj.visible = false;
        obj.userData.deckIndex = -1;
      } else if (obj.userData.itemType === 'exit') {
        winGame();
      }
      return;
    }

    if (obj.userData.isStairs) {
      descendDeck(obj.userData.toLevel);
      return;
    }
  }
}

function showPrompt(text, duration) {
  interactionPrompt.textContent = text;
  interactionPrompt.style.display = 'block';
  if (duration) {
    setTimeout(() => {
      interactionPrompt.style.display = 'none';
    }, duration);
  }
}

// ==================== DECK TRANSITIONS ====================
function descendDeck(toLevel) {
  jumpScareOverlay.style.display = 'flex';
  jumpScareOverlay.style.background = '#000';
  jumpScareOverlay.style.opacity = '1';

  setTimeout(() => {
    state.currentDeck = toLevel;
    world.showDeck(toLevel);
    camera.position.copy(world.getSpawnPoint());

    const layout = world.getDeckLayout();
    depthIndicator.textContent = layout.name;

    scene.fog.density = 0.06 + toLevel * 0.02;
    renderer.toneMappingExposure = 1.2 - toLevel * 0.15;

    setTimeout(() => {
      jumpScareOverlay.style.display = 'none';
    }, 500);
  }, 1000);
}

// ==================== JUMP SCARES ====================
function checkScares() {
  if (state.scareActive || state.scareCooldown > 0) return;

  const scares = world.getScares();
  const playerPos = camera.position;

  scares.forEach(scare => {
    if (scare.triggered) return;
    const dist = playerPos.distanceTo(new THREE.Vector3(...scare.pos));
    if (dist < 3) {
      scare.triggered = true;
      triggerScare(scare.type);
    }
  });
}

function triggerScare(type) {
  state.scareActive = true;
  state.scareCooldown = 10;

  if (type === 'shadow' || type === 'figure') {
    const figureMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const figure = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.3), figureMat);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    figure.position.copy(camera.position).add(dir.multiplyScalar(5));
    figure.position.y = 0.9;
    scene.add(figure);

    jumpScareOverlay.style.display = 'flex';
    jumpScareOverlay.classList.add('active');
    audio.playJumpScare();

    setTimeout(() => {
      jumpScareOverlay.style.display = 'none';
      jumpScareOverlay.classList.remove('active');
      scene.remove(figure);
      state.scareActive = false;
    }, 800);
  } else if (type === 'bang') {
    audio.playJumpScare();
    const origPos = camera.position.clone();
    let shakeTime = 0;
    const shake = () => {
      shakeTime += 16;
      if (shakeTime < 500) {
        camera.position.x = origPos.x + (Math.random() - 0.5) * 0.05;
        camera.position.y = origPos.y + (Math.random() - 0.5) * 0.03;
        requestAnimationFrame(shake);
      } else {
        camera.position.copy(origPos);
        state.scareActive = false;
      }
    };
    shake();
  } else if (type === 'chase') {
    audio.playJumpScare();
    jumpScareOverlay.style.display = 'flex';
    jumpScareOverlay.classList.add('active');
    setTimeout(() => {
      jumpScareOverlay.style.display = 'none';
      jumpScareOverlay.classList.remove('active');
      state.scareActive = false;
    }, 1200);
  } else if (type === 'whisper') {
    scene.fog.density += 0.05;
    setTimeout(() => {
      scene.fog.density -= 0.05;
      state.scareActive = false;
    }, 5000);
  }
}

// ==================== WIN / DEATH ====================
function winGame() {
  state.won = true;
  state.playing = false;
  if (!isMobile) document.exitPointerLock();
  hud.style.display = 'none';

  deathScreen.querySelector('h1').textContent = 'СПАСЕНИЕ';
  deathScreen.querySelector('h2').textContent = 'You escaped';
  deathScreen.querySelector('p').textContent =
    'You emerged from the darkness. But the ship still waits for others...';
  deathScreen.style.display = 'flex';
}

function die() {
  state.playing = false;
  if (!isMobile) document.exitPointerLock();
  hud.style.display = 'none';
  deathScreen.style.display = 'flex';
}

// ==================== PROXIMITY PROMPTS ====================
function updateProximityPrompts() {
  raycaster.setFromCamera(interactionRay, camera);

  const allTargets = [
    ...world.doors.filter(d => d.userData.deckIndex === state.currentDeck),
    ...world.interactables.filter(i => i.userData.deckIndex === state.currentDeck && i.visible),
  ];

  const hits = raycaster.intersectObjects(allTargets);
  if (hits.length > 0 && !state.readingNote) {
    const obj = hits[0].object;
    const prefix = isMobile ? '[TAP E]' : '[E]';
    if (obj.userData.isDoor) {
      if (obj.userData.isOpen) {
        interactionPrompt.style.display = 'none';
      } else if (obj.userData.locked && !state.hasKey) {
        showPrompt(`${prefix} Locked — ЗАПЕРТО`);
      } else {
        showPrompt(`${prefix} Open Door — ОТКРЫТЬ`);
      }
    } else if (obj.userData.isNote) {
      showPrompt(`${prefix} Read Note — ЧИТАТЬ`);
    } else if (obj.userData.isItem) {
      showPrompt(`${prefix} Pick up: ${obj.userData.label}`);
    } else if (obj.userData.isStairs) {
      showPrompt(`${prefix} Descend — СПУСТИТЬСЯ ВНИЗ`);
    }
  } else if (!state.readingNote) {
    interactionPrompt.style.display = 'none';
  }
}

// ==================== GAME LOOP ====================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (!state.playing) {
    renderer.render(scene, camera);
    return;
  }

  // Movement
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  state.direction.set(0, 0, 0);

  // Desktop keyboard
  if (state.keys['KeyW'] || state.keys['ArrowUp']) state.direction.add(forward);
  if (state.keys['KeyS'] || state.keys['ArrowDown']) state.direction.sub(forward);
  if (state.keys['KeyA'] || state.keys['ArrowLeft']) state.direction.sub(right);
  if (state.keys['KeyD'] || state.keys['ArrowRight']) state.direction.add(right);

  // Mobile joystick
  if (state.joystickActive) {
    const deadzone = 0.15;
    if (Math.abs(state.joystickY) > deadzone) {
      state.direction.addScaledVector(forward, -state.joystickY);
    }
    if (Math.abs(state.joystickX) > deadzone) {
      state.direction.addScaledVector(right, state.joystickX);
    }
  }

  if (state.direction.length() > 0) {
    state.direction.normalize();
    const move = state.direction.clone().multiplyScalar(state.moveSpeed * delta);
    const newPos = camera.position.clone().add(move);
    newPos.y = 1.6;

    // Wall collision check
    const playerRadius = 0.3;
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      newPos,
      new THREE.Vector3(playerRadius * 2, 1.6, playerRadius * 2)
    );
    let blocked = false;
    for (const collider of world.colliders) {
      if (playerBox.intersectsBox(collider)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      camera.position.copy(newPos);
    }

    state.footstepTimer += delta;
    if (state.footstepTimer >= state.footstepInterval) {
      state.footstepTimer = 0;
      audio.playFootstep();
    }
  }

  camera.position.y = 1.6;

  // Flashlight
  if (state.flashlightOn && state.battery > 0) {
    state.battery -= state.batteryDrain * delta;
    flashlight.intensity = 30 * (state.battery / 100);
    flashlight.visible = true;
    if (state.battery < 20) {
      flashlight.intensity *= 0.5 + Math.random() * 0.5;
    }
  } else {
    flashlight.visible = false;
    if (state.battery <= 0) state.flashlightOn = false;
  }

  // Battery UI
  batteryFill.style.width = `${Math.max(0, state.battery)}%`;
  if (state.battery > 50) {
    batteryFill.style.background = '#4caf50';
  } else if (state.battery > 20) {
    batteryFill.style.background = '#ff9800';
  } else {
    batteryFill.style.background = '#f44336';
  }

  if (state.battery <= 0 && state.currentDeck === 2) {
    die();
  }

  updateProximityPrompts();

  state.scareCooldown = Math.max(0, state.scareCooldown - delta);
  checkScares();

  // Animate items
  const time = clock.elapsedTime;
  world.interactables.forEach(item => {
    if (item.userData.isItem && item.visible) {
      item.position.y = item.userData.originalY
        ? item.userData.originalY + Math.sin(time * 2) * 0.05
        : item.position.y;
      if (!item.userData.originalY) item.userData.originalY = item.position.y;
      item.rotation.y += delta * 0.5;
    }
  });

  // Head bob
  if (state.direction.length() > 0) {
    camera.position.y += Math.sin(time * 8) * 0.02;
  }

  renderer.render(scene, camera);
}

// ==================== RESIZE ====================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==================== INIT ====================
depthIndicator.textContent = world.getDeckLayout().name;
animate();
