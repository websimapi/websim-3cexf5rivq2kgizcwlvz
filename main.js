import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TwitchConnector } from './twitch.js';
import { Marble } from './marble.js';
import { createTrack } from './track.js';
import { UI } from './ui.js';

class MarbleRaceGame {
    constructor() {
        this.initGraphics();
        this.initPhysics();
        this.initScene();
        this.initUI();
        this.initEventListeners();

        this.marbles = {};
        this.gameState = 'idle'; // idle, joining, racing, finished
        this.joinCommand = '!join';
    }

    initGraphics() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 20, 30);

        this.renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#c'), antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0); // Transparent background

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
    }

    initPhysics() {
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });
    }

    initScene() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        this.track = createTrack(this.scene, this.world);
    }

    initUI() {
        this.ui = new UI();
        this.twitch = new TwitchConnector(
            (channel) => this.ui.onConnected(channel),
            (channel) => this.ui.onDisconnected(channel),
            (user) => this.handleJoin(user)
        );
    }
    
    initEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        this.ui.connectBtn.addEventListener('click', () => {
            const channel = this.ui.channelInput.value;
            if (channel) {
                this.twitch.connect(channel);
            }
        });
        this.ui.startRaceBtn.addEventListener('click', () => this.startRace());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    handleJoin(user) {
        if (this.gameState !== 'joining') return;
        if (this.marbles[user.username]) return; // Already joined

        const username = user['display-name'] || user.username;
        const color = user.color || `#${Math.floor(Math.random()*16777215).toString(16)}`;

        const startPosition = new THREE.Vector3(
            (Math.random() - 0.5) * 8, 
            25, 
            -48 + (Math.random() - 0.5) * 5
        );
        const marble = new Marble(username, color, startPosition, this.scene, this.world);
        this.marbles[user.username] = marble;
        this.ui.addJoinedPlayer(username);
        console.log(`${username} joined the race!`);
    }

    startRace() {
        if (Object.keys(this.marbles).length === 0) {
            alert("No players have joined!");
            return;
        }

        this.ui.showCountdown(3, () => {
            this.gameState = 'racing';
            this.ui.setGameState('racing');
            Object.values(this.marbles).forEach(marble => {
                marble.body.wakeUp();
            });
        });
    }
    
    updateLeaderboard() {
        const sortedMarbles = Object.values(this.marbles).sort((a, b) => {
            return b.body.position.z - a.body.position.z;
        });
        this.ui.updateLeaderboard(sortedMarbles.slice(0, 10));
    }


    animate() {
        requestAnimationFrame(() => this.animate());

        this.world.step(1 / 60);

        for (const username in this.marbles) {
            this.marbles[username].update();
        }

        if (this.gameState === 'racing') {
            this.updateLeaderboard();
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        this.animate();
    }
}

const game = new MarbleRaceGame();
game.start();


