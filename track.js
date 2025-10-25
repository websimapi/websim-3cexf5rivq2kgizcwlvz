import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTrack(scene, world) {
    const trackParts = [];

    // Ground
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x333333, side: THREE.DoubleSide });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const groundBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    // Starting platform
    createBox(scene, world, { x: 10, y: 1, z: 5 }, { x: 0, y: 14, z: -22 }, 0x00ff00);
    
    // First ramp
    createRamp(scene, world, { x: 10, y: 1, z: 20 }, { x: 0, y: 8, z: -10 }, { axis: 'x', angle: Math.PI / 8 });

    // Second ramp - tilted
    createRamp(scene, world, { x: 10, y: 1, z: 20 }, { x: 0, y: 2, z: 10 }, { axis: 'x', angle: -Math.PI / 12 });

    // Finish line platform
    createBox(scene, world, { x: 10, y: 1, z: 5 }, { x: 0, y: 0.5, z: 22 }, 0xff0000);

    // Walls
    createWall(scene, world, {x: 1, y:2, z: 50}, {x: -5.5, y: 1, z: 0});
    createWall(scene, world, {x: 1, y:2, z: 50}, {x: 5.5, y: 1, z: 0});

}

function createBox(scene, world, size, position, color = 0x888888) {
    const { x, y, z } = size;
    // 3D Mesh
    const geo = new THREE.BoxGeometry(x, y, z);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(position.x, position.y, position.z);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Physics Body
    const shape = new CANNON.Box(new CANNON.Vec3(x / 2, y / 2, z / 2));
    const body = new CANNON.Body({ mass: 0, shape });
    body.position.set(position.x, position.y, position.z);
    world.addBody(body);
}

function createRamp(scene, world, size, position, rotation, color = 0x888888) {
    const { x, y, z } = size;
    const geo = new THREE.BoxGeometry(x, y, z);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(position.x, position.y, position.z);
    
    const R = rotation;
    if (R.axis === 'x') mesh.rotation.x = R.angle;
    if (R.axis === 'y') mesh.rotation.y = R.angle;
    if (R.axis === 'z') mesh.rotation.z = R.angle;
    
    mesh.receiveShadow = true;
    scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(x / 2, y / 2, z / 2));
    const body = new CANNON.Body({ mass: 0, shape });
    body.position.set(position.x, position.y, position.z);
    body.quaternion.setFromAxisAngle(
        new CANNON.Vec3(R.axis === 'x' ? 1 : 0, R.axis === 'y' ? 1 : 0, R.axis === 'z' ? 1 : 0),
        R.angle
    );
    world.addBody(body);
}

function createWall(scene, world, size, position) {
    createBox(scene, world, size, position, 0x444444)
}

