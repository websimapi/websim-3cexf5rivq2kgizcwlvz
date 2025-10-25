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
    scene.add(group);

    // 3D Mesh
    const geo = new THREE.BoxGeometry(x, y, z);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    group.add(mesh);
    
    // Physics Body
    const shape = new CANNON.Box(new CANNON.Vec3(x / 2, y / 2, z / 2));
    const body = new CANNON.Body({ mass: 0, shape, material: wallMaterial });
    body.position.copy(position);
    body.quaternion.copy(quaternion);
    world.addBody(body);

    return group;
}

function createStraight(scene, world, { width, length, slope }, startPosition, startRotation) {
    const slopeAngle = -slope * (Math.PI / 180);

    // Determine orientation vectors from startRotation
    const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(startRotation);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(startRotation);

    // Calculate the displacement vector for the piece's length, accounting for slope
    const horizontalDisp = forwardDir.clone().multiplyScalar(length * Math.cos(slopeAngle));
    const verticalDisp = new THREE.Vector3(0, 1, 0).multiplyScalar(length * Math.sin(slopeAngle));
    const totalDisplacement = horizontalDisp.add(verticalDisp);
    
    // The end position is the start position plus the total displacement
    const endPosition = startPosition.clone().add(totalDisplacement);

    // The center of the piece is halfway between start and end
    const centerPosition = startPosition.clone().add(totalDisplacement.clone().multiplyScalar(0.5));

    // The rotation of the piece needs to account for the slope around its local "right" axis
    const slopeQuat = new THREE.Quaternion().setFromAxisAngle(rightDir, slopeAngle);
    const pieceRotation = startRotation.clone().multiply(slopeQuat);

    createTrackPiece(scene, world, {
        size: { x: width, y: 0.2, z: length },
        position: centerPosition,
        quaternion: pieceRotation,
        color: 0x5555ff,
        info: { type: 'straight', length, slope }
    });
    
    // Walls
    const wallHeight = 2;
    const wallThickness = 0.5;
    const wallYOffset = wallHeight / 2 + 0.1; // Place walls on top of track base

    // Left wall
    const leftWallLocalPos = new THREE.Vector3(-width/2 - wallThickness/2, wallYOffset, 0);
    const leftWallWorldPos = centerPosition.clone().add(leftWallLocalPos.clone().applyQuaternion(pieceRotation));
    createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: length}, position: leftWallWorldPos, quaternion: pieceRotation, color: 0x444444, info: { type: 'wall' }});

    // Right wall
    const rightWallLocalPos = new THREE.Vector3(width/2 + wallThickness/2, wallYOffset, 0);
    const rightWallWorldPos = centerPosition.clone().add(rightWallLocalPos.clone().applyQuaternion(pieceRotation));
    createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: length}, position: rightWallWorldPos, quaternion: pieceRotation, color: 0x444444, info: { type: 'wall' }});

    return { endPosition, endRotation: startRotation }; // End rotation does not change for a straight piece
}

function createTurn(scene, world, { width, angle }, startPosition, startRotation) {
    const turnAngleRad = angle * (Math.PI / 180);
    const isRightTurn = angle > 0;
    const turnRadius = width; // Define the turn radius, can be adjusted. Using track width for a wide turn.

    // Define vectors based on the incoming rotation
    const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(startRotation);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(startRotation);
    const upDir = new THREE.Vector3(0, 1, 0);

    // The pivot point for the turn is offset from the start point along the "right" direction
    const pivotOffset = rightDir.clone().multiplyScalar(isRightTurn ? turnRadius : -turnRadius);
    const pivotPoint = startPosition.clone().add(pivotOffset);

    // The center of the turn piece is the pivot point, with an offset back towards the start.
    // It's the center of the arc.
    // The position of the track piece itself is halfway through the turn arc.
    const halfTurnAngleQuat = new THREE.Quaternion().setFromAxisAngle(upDir, turnAngleRad / 2);
    const centerOfArcDirection = forwardDir.clone().applyQuaternion(halfTurnAngleQuat);
    const position = pivotPoint.clone().sub(pivotOffset.clone().applyQuaternion(halfTurnAngleQuat));
    
    // The final rotation after the turn
    const turnQuat = new THREE.Quaternion().setFromAxisAngle(upDir, turnAngleRad);
    const endRotation = startRotation.clone().multiply(turnQuat);
    const pieceRotation = startRotation.clone().multiply(halfTurnAngleQuat);
    
    // The end position is calculated by rotating the vector from pivot to start around the pivot
    const endPosition = pivotPoint.clone().sub(pivotOffset.clone().applyQuaternion(turnQuat));
    
    // The visual group for the turn piece itself doesn't need to be rotated, its contents are positioned locally
    const turnGroup = createTrackPiece(scene, world, {
        size: { x: width, y: 0.2, z: width },
        position: position,
        quaternion: pieceRotation,
        color: 0x55ff55,
        info: { type: 'turn', angle }
    });
    
    const wallHeight = 2;
    const wallThickness = 0.5;
    const wallY = wallHeight / 2 + 0.1;

    // These wall pieces are part of the `turnGroup` so their positions are local to it.
    // The `turnGroup` itself is already positioned and rotated correctly. We just need to add children to it.
    const groupBody = world.bodies.find(b => b.position.equals(position)); // find the body we just created
    
    // Outer Wall
    const outerWallLocalPos = new THREE.Vector3(isRightTurn ? width / 2 + wallThickness / 2 : -width / 2 - wallThickness / 2, wallY, 0);
    const outerWallWorldPos = position.clone().add(outerWallLocalPos.clone().applyQuaternion(pieceRotation));
    createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: width + wallThickness}, position: outerWallWorldPos, quaternion: pieceRotation, color: 0x444444, info: { type: 'wall' }});

    // Inner Wall
    const innerWallLocalPos = new THREE.Vector3(isRightTurn ? -width / 2 - wallThickness / 2 : width / 2 + wallThickness / 2, wallY, 0);
    const innerWallWorldPos = position.clone().add(innerWallLocalPos.clone().applyQuaternion(pieceRotation));
    createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: width + wallThickness}, position: innerWallWorldPos, quaternion: pieceRotation, color: 0x444444, info: { type: 'wall' }});

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
    createTrackPiece(scene, world, {
        size: {x: trackWidth + 1, y: 4, z: 0.5},
        position: new THREE.Vector3(currentPos.x, currentPos.y + 2, currentPos.z - 4.25),
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