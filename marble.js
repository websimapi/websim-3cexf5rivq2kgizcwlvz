import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { getWallMaterial } from './track.js';

const marbleMaterial = new CANNON.Material('marbleMaterial');

// Define interaction properties
export function getMarbleContactMaterial() {
    return new CANNON.ContactMaterial(getWallMaterial(), marbleMaterial, {
        friction: 0.1,
        restitution: 0.7, // A bit bouncy
    });
}

export function createMarble(scene, world, username, color) {
    const radius = 0.5;
    
    // 3D Mesh
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: color || 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    scene.add(mesh);

    // Physics Body
    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
        mass: 1,
        shape: shape,
        material: marbleMaterial,
    });
    
    const startX = (Math.random() - 0.5) * 8;
    const startZ = -38 + (Math.random() - 0.5) * 4;
    body.position.set(startX, 15.5, startZ);
    world.addBody(body);

    const marble = { mesh, body, username };

    // Add username label
    const fontLoader = new FontLoader();
    fontLoader.load('https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        const textGeometry = new TextGeometry(username, {
            font: font,
            size: 0.3,
            height: 0.05,
        });
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.geometry.center();
        
        // This will be handled in the main animation loop to always face the camera
        // textMesh.quaternion.copy(camera.quaternion);
        
        marble.label = textMesh;
        scene.add(textMesh);
    });


    return marble;
}