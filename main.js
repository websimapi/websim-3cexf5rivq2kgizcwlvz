import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupTwitch } from './twitch.js';
import { createMarble, getMarbleContactMaterial } from './marble.js';
import { createTrack } from './track.js';
import { updatePlayerList, updateLeaderboard, setConnectionStatus, showRaceControls, resetUI } from './ui.js';

let scene, camera, renderer, controls;
let physicsWorld;
let backgroundTexture;
let raycaster, mouse;

const marbles = [];
const players = new Map(); // username -> marble object

let raceState = 'waiting'; // waiting, countdown, racing, finished
let countdownTimer = 15;
let countdownInterval;

const JOIN_COMMAND = '!join';
const MAX_PLAYERS = 50;

function init() {
    // Scene
    scene = new THREE.Scene();
    backgroundTexture = new THREE.TextureLoader().load('background.png');
    scene.background = backgroundTexture;

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 40);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Raycasting for piece selection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Physics
    physicsWorld = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    physicsWorld.addContactMaterial(getMarbleContactMaterial());

    // Track
    createTrack(scene, physicsWorld);

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    document.getElementById('connect-btn').addEventListener('click', connectToTwitch);
    document.getElementById('start-race-btn').addEventListener('click', startRaceCountdown);
    document.getElementById('reset-race-btn').addEventListener('click', resetRace);
    window.addEventListener('click', onCanvasClick);

    // Game Loop
    animate();
}

function connectToTwitch() {
    const channel = document.getElementById('channel-name').value;
    if (!channel) {
        alert('Please enter a Twitch channel name.');
        return;
    }
    setConnectionStatus('Connecting...');
    setupTwitch(channel, handleUserJoin);
}

function handleUserJoin(username, color) {
    if (raceState !== 'waiting') return;
    if (players.has(username) || players.size >= MAX_PLAYERS) return;

    const marble = createMarble(scene, physicsWorld, username, color);
    marbles.push(marble);
    players.set(username, marble);

    updatePlayerList(Array.from(players.keys()));
}

function startRaceCountdown() {
    if (raceState !== 'waiting' || players.size < 1) return;
    
    raceState = 'countdown';
    document.getElementById('start-race-btn').disabled = true;
    
    const timerEl = document.getElementById('timer');
    timerEl.style.display = 'block';
    timerEl.textContent = `Race starts in: ${countdownTimer}s`;

    countdownInterval = setInterval(() => {
        countdownTimer--;
        timerEl.textContent = `Race starts in: ${countdownTimer}s`;
        if (countdownTimer <= 0) {
            clearInterval(countdownInterval);
            timerEl.style.display = 'none';
            startRace();
        }
    }, 1000);
}

function startRace() {
    raceState = 'racing';
    document.getElementById('leaderboard').classList.remove('hidden');
    
    marbles.forEach(marble => {
        // Give a slight random push to start
        const force = new CANNON.Vec3(
            (Math.random() - 0.5) * 5,
            0,
            (Math.random() - 0.5) * 10 - 5
        );
        marble.body.applyImpulse(force, marble.body.position);
    });
}

function resetRace() {
    raceState = 'waiting';
    
    marbles.forEach(marble => {
        if(marble.mesh) scene.remove(marble.mesh);
        if(marble.body) physicsWorld.removeBody(marble.body);
        if(marble.label) scene.remove(marble.label);
    });
    marbles.length = 0;
    players.clear();

    countdownTimer = 15;
    if(countdownInterval) clearInterval(countdownInterval);

    resetUI();
    console.log("Race reset.");
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if (raceState === 'racing' || raceState === 'countdown') {
        physicsWorld.step(1 / 60);

        marbles.forEach(marble => {
            marble.mesh.position.copy(marble.body.position);
            marble.mesh.quaternion.copy(marble.body.quaternion);
            if (marble.label) {
                 marble.label.position.copy(marble.mesh.position).add(new THREE.Vector3(0, 1.2, 0));
                 marble.label.quaternion.copy(camera.quaternion);
            }
        });

        if (raceState === 'racing') {
            updateLeaderboard(marbles);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

function onCanvasClick(event) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true); // Check recursively

    let foundPiece = false;
    for (let i = 0; i < intersects.length; i++) {
        let object = intersects[i].object;
        // Traverse up to find parent with userData
        while (object && !object.userData.info) {
            object = object.parent;
        }

        if (object && object.userData.info) {
            const tooltip = document.getElementById('tooltip');
            const tooltipTitle = document.getElementById('tooltip-title');
            const tooltipContent = document.getElementById('tooltip-content');

            tooltipTitle.textContent = `Track Piece: ${object.userData.info.type}`;
            tooltipContent.textContent = JSON.stringify(object.userData.info, null, 2);

            tooltip.style.display = 'block';
            tooltip.style.left = `${event.clientX + 15}px`;
            tooltip.style.top = `${event.clientY + 15}px`;

            foundPiece = true;
            break; 
        }
    }
    
    if (!foundPiece) {
        document.getElementById('tooltip').style.display = 'none';
    }
}

init();