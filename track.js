import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Re-export wall material for marbles to use
export const wallMaterial = new CANNON.Material('wallMaterial');

function createTrackPiece(scene, world, size, position, rotation, color = 0x888888) {
    const { x, y, z } = size;
    // 3D Mesh
    const geo = new THREE.BoxGeometry(x, y, z);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.receiveShadow = true;
    if (rotation.quaternion) {
        mesh.quaternion.copy(rotation.quaternion);
    }
    scene.add(mesh);

    // Physics Body
    const shape = new CANNON.Box(new CANNON.Vec3(x / 2, y / 2, z / 2));
    const body = new CANNON.Body({ mass: 0, shape, material: wallMaterial });
    body.position.copy(position);
    if (rotation.quaternion) {
        body.quaternion.copy(rotation.quaternion);
    }
    world.addBody(body);
}

function createStraight(scene, world, { width, length, slope }, startPosition, startRotation) {
    const angle = -slope * (Math.PI / 180); // Convert slope from degrees to radians
    const yOffset = Math.sin(angle) * (length / 2);
    const zOffset = Math.cos(angle) * (length / 2);

    const position = new THREE.Vector3(0, yOffset, zOffset).applyQuaternion(startRotation).add(startPosition);
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle).multiply(startRotation);

    createTrackPiece(scene, world, { x: width, y: 0.2, z: length }, position, { quaternion: rotation }, 0x5555ff);
    
    // Walls
    const wallHeight = 2;
    const wallThickness = 0.5;
    const wallY = wallHeight / 2 - 0.1;

    // Left wall
    const leftWallPos = new THREE.Vector3(-width/2 - wallThickness/2, wallY, 0).applyQuaternion(rotation).add(position);
    createTrackPiece(scene, world, {x: wallThickness, y: wallHeight, z: length}, leftWallPos, {quaternion: rotation}, 0x444444);

    // Right wall
    const rightWallPos = new THREE.Vector3(width/2 + wallThickness/2, wallY, 0).applyQuaternion(rotation).add(position);
    createTrackPiece(scene, world, {x: wallThickness, y: wallHeight, z: length}, rightWallPos, {quaternion: rotation}, 0x444444);

    const endPosition = new THREE.Vector3(0, yOffset * 2, zOffset * 2).applyQuaternion(startRotation).add(startPosition);

    return { endPosition, endRotation: startRotation };
}

function createTurn(scene, world, { width, angle }, startPosition, startRotation) {
    const turnAngleRad = angle * (Math.PI / 180);
    const pivotPoint = new THREE.Vector3(-width/2, 0, width/2).applyQuaternion(startRotation).add(startPosition);

    const position = new THREE.Vector3(width/2, 0, -width/2).applyQuaternion(startRotation).add(pivotPoint);

    createTrackPiece(scene, world, { x: width, y: 0.2, z: width }, position, { quaternion: startRotation }, 0x55ff55);

    const wallHeight = 2;
    const wallThickness = 0.5;
    const wallY = wallHeight / 2 - 0.1;

    // Outer wall
    const outerWallPos = new THREE.Vector3(width / 2 + wallThickness / 2, wallY, 0).applyQuaternion(startRotation).add(position);
    createTrackPiece(scene, world, { x: wallThickness, y: wallHeight, z: width }, outerWallPos, { quaternion: startRotation }, 0x444444);
    
    // Back wall
    const backWallPos = new THREE.Vector3(0, wallY, -width/2 - wallThickness/2).applyQuaternion(startRotation).add(position);
    createTrackPiece(scene, world, { x: width + wallThickness*2, y: wallHeight, z: wallThickness }, backWallPos, { quaternion: startRotation }, 0x444444);

    const endRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnAngleRad).multiply(startRotation);
    const endPosition = new THREE.Vector3(width, 0, 0).applyQuaternion(startRotation).add(startPosition);
    
    return { endPosition, endRotation };
}


export function createTrack(scene, world) {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
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

    let currentPos = new THREE.Vector3(0, 15, -40);
    let currentRot = new THREE.Quaternion();
    const trackWidth = 10;

    // Back Wall
    createTrackPiece(scene, world, {x: trackWidth, y: 3, z: 0.5}, new THREE.Vector3(currentPos.x, currentPos.y + 1.5, currentPos.z - 4.25), {quaternion: currentRot}, 0x333333);

    // Piece 1: Starting Platform (short straight)
    let piece = createStraight(scene, world, { width: trackWidth, length: 8, slope: 0 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;

    // Piece 2: Downward Ramp
    piece = createStraight(scene, world, { width: trackWidth, length: 40, slope: 15 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;

    // Piece 3: Turn Left
    piece = createTurn(scene, world, { width: trackWidth, angle: -90 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;

    // Piece 4: Straight section
    piece = createStraight(scene, world, { width: trackWidth, length: 20, slope: 0 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;

    // Piece 5: Turn Right
    piece = createTurn(scene, world, { width: trackWidth, angle: 90 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;
    
    // Piece 6: Long downward ramp
    piece = createStraight(scene, world, { width: trackWidth, length: 50, slope: 10 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;
    
    // Piece 7: Finish line
    createTrackPiece(scene, world, {x: trackWidth, y: 0.5, z: 1}, currentPos, {quaternion: currentRot}, 0xff0000);
}