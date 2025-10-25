import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Re-export wall material for marbles to use
const wallMaterial = new CANNON.Material('wallMaterial');
export function getWallMaterial() {
    return wallMaterial;
}

function createTrackPiece(scene, world, { size, position, quaternion, color = 0x888888, info = {} }) {
    const { x, y, z } = size;
    const group = new THREE.Group();
    group.position.copy(position);
    group.quaternion.copy(quaternion);
    group.userData.info = info;

    // Create physics body first to attach to group
    const shape = new CANNON.Box(new CANNON.Vec3(x / 2, y / 2, z / 2));
    const body = new CANNON.Body({ mass: 0, material: wallMaterial });
    body.addShape(shape); // Add shape to body
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);
    group.userData.body = body; // Optional: link body to group

    scene.add(group);

    // 3D Mesh
    const geo = new THREE.BoxGeometry(x, y, z);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    group.add(mesh);
    
    return group;
}

function createStraight(scene, world, { width, length, slope }, startPosition, startRotation) {
    const slopeAngle = -slope * (Math.PI / 180);
    const slopeQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), slopeAngle);
    
    const pieceRotation = startRotation.clone().multiply(slopeQuat);
    
    const centerOffset = new THREE.Vector3(0, -length * Math.sin(slopeAngle) / 2, length * Math.cos(slopeAngle) / 2);
    const worldCenterOffset = centerOffset.clone().applyQuaternion(startRotation);
    const position = startPosition.clone().add(worldCenterOffset);

    const floorGroup = new THREE.Group();
    floorGroup.userData.info = { type: 'straight', length, slope };
    scene.add(floorGroup);

    // Floor Mesh
    const floorGeo = new THREE.BoxGeometry(width, 0.2, length);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x5555ff });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.receiveShadow = true;
    floorGroup.add(floorMesh);

    // Floor Physics
    const floorShape = new CANNON.Box(new CANNON.Vec3(width / 2, 0.1, length / 2));
    const floorBody = new CANNON.Body({ mass: 0, shape: floorShape, material: wallMaterial });
    floorBody.position.copy(position);
    floorBody.quaternion.copy(pieceRotation);
    world.addBody(floorBody);
    
    floorGroup.position.copy(floorBody.position);
    floorGroup.quaternion.copy(floorBody.quaternion);

    // Walls
    const wallHeight = 2;
    const wallThickness = 0.5;
    const wallYOffset = wallHeight / 2 - 0.1;

    // Left wall
    const leftWallLocalPos = new THREE.Vector3(-width/2 - wallThickness/2, wallYOffset, 0);
    createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: length}, position: floorBody.pointToWorldFrame(new CANNON.Vec3().copy(leftWallLocalPos)), quaternion: pieceRotation, color: 0x444444, info: { type: 'wall' }});

    // Right wall
    const rightWallLocalPos = new THREE.Vector3(width/2 + wallThickness/2, wallYOffset, 0);
    createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: length}, position: floorBody.pointToWorldFrame(new CANNON.Vec3().copy(rightWallLocalPos)), quaternion: pieceRotation, color: 0x444444, info: { type: 'wall' }});

    const endOffset = new THREE.Vector3(0, -length * Math.sin(slopeAngle), length * Math.cos(slopeAngle));
    const endPosition = startPosition.clone().add(endOffset.applyQuaternion(startRotation));

    return { endPosition, endRotation: startRotation };
}

function createTurn(scene, world, { width, angle }, startPosition, startRotation) {
    const turnAngleRad = angle * (Math.PI / 180);
    const isRightTurn = angle > 0;
    const segments = 12;
    const radius = width; // outer radius
    const innerRadius = width - width; // assuming track width is `width`
    
    const turnGroup = new THREE.Group();
    turnGroup.userData.info = { type: 'turn', angle };
    scene.add(turnGroup);

    const segmentAngle = turnAngleRad / segments;
    const segmentLength = (radius - width / 2) * Math.abs(segmentAngle);

    let currentAngle = 0;
    let lastSegmentPos = startPosition.clone();
    let lastSegmentRot = startRotation.clone();

    for (let i = 0; i < segments; i++) {
        const rotQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), segmentAngle / 2);
        const nextSegmentRot = lastSegmentRot.clone().multiply(rotQuat);
        
        const offset = new THREE.Vector3(0, 0, segmentLength).applyQuaternion(nextSegmentRot);
        const segmentPos = lastSegmentPos.clone().add(offset);
        
        // Floor
        const floorGeo = new THREE.BoxGeometry(width, 0.2, segmentLength);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x55ff55 });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.position.copy(segmentPos);
        floorMesh.quaternion.copy(nextSegmentRot);
        turnGroup.add(floorMesh);

        const floorShape = new CANNON.Box(new CANNON.Vec3(width / 2, 0.1, segmentLength / 2));
        const floorBody = new CANNON.Body({ mass: 0, shape: floorShape, material: wallMaterial });
        floorBody.position.copy(segmentPos);
        floorBody.quaternion.copy(nextSegmentRot);
        world.addBody(floorBody);

        // Walls
        const wallHeight = 2;
        const wallThickness = 0.5;

        // Outer wall
        const outerWallOffset = new THREE.Vector3(isRightTurn ? width/2 + wallThickness/2 : -width/2 - wallThickness/2, wallHeight/2 - 0.1, 0);
        createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: segmentLength}, position: floorBody.pointToWorldFrame(new CANNON.Vec3().copy(outerWallOffset)), quaternion: nextSegmentRot, color: 0x444444, info: { type: 'wall' }});

        // Inner wall
        const innerWallOffset = new THREE.Vector3(isRightTurn ? -width/2 - wallThickness/2 : width/2 + wallThickness/2, wallHeight/2 - 0.1, 0);
        createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: segmentLength}, position: floorBody.pointToWorldFrame(new CANNON.Vec3().copy(innerWallOffset)), quaternion: nextSegmentRot, color: 0x444444, info: { type: 'wall' }});


        lastSegmentPos = segmentPos.clone().add(new THREE.Vector3(0,0,segmentLength/2).applyQuaternion(nextSegmentRot));
        lastSegmentRot.multiply(rotQuat);
    }
    
    const endRotation = startRotation.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnAngleRad));
    const finalOffset = new THREE.Vector3(0,0,segmentLength/2).applyQuaternion(lastSegmentRot);
    const endPosition = lastSegmentPos.clone();

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

    let currentPos = new THREE.Vector3(0, 5, -40);
    let currentRot = new THREE.Quaternion();
    const trackWidth = 10;

    // Back Wall
    createTrackPiece(scene, world, {
        size: {x: trackWidth + 1, y: 4, z: 0.5},
        position: new THREE.Vector3(currentPos.x, currentPos.y + 2, currentPos.z - 0.25),
        quaternion: currentRot,
        color: 0x333333,
        info: { type: 'back-wall' }
    });

    // Piece 1: Starting Platform (short straight)
    let piece = createStraight(scene, world, { width: trackWidth, length: 8, slope: 0 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;

    // Piece 2: Downward Ramp
    piece = createStraight(scene, world, { width: trackWidth, length: 40, slope: 20 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;

    // Piece 3: Turn Right
    piece = createTurn(scene, world, { width: trackWidth, angle: 90 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;

    // Piece 4: Straight section
    piece = createStraight(scene, world, { width: trackWidth, length: 20, slope: 0 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;

    // Piece 5: Turn Left
    piece = createTurn(scene, world, { width: trackWidth, angle: -90 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;
    
    // Piece 6: Long downward ramp
    piece = createStraight(scene, world, { width: trackWidth, length: 50, slope: 15 }, currentPos, currentRot);
    currentPos = piece.endPosition;
    currentRot = piece.endRotation;
    
    // Piece 7: Finish line
    createTrackPiece(scene, world, {
        size: {x: trackWidth, y: 0.5, z: 1},
        position: currentPos.clone().add(new THREE.Vector3(0,0,0.5).applyQuaternion(currentRot)),
        quaternion: currentRot,
        color: 0xff0000,
        info: { type: 'finish-line' }
    });
}