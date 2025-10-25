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
    const slopeQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), slopeAngle);
    
    const pieceRotation = startRotation.clone().multiply(slopeQuat);
    
    const centerOffset = new THREE.Vector3(0, -length * Math.sin(slopeAngle) / 2, length * Math.cos(slopeAngle) / 2);
    const worldCenterOffset = centerOffset.clone().applyQuaternion(startRotation);
    const position = startPosition.clone().add(worldCenterOffset);

    createTrackPiece(scene, world, {
        size: { x: width, y: 0.2, z: length },
        position,
        quaternion: pieceRotation,
        color: 0x5555ff,
        info: { type: 'straight', length, slope }
    });
    
    // Walls
    const wallHeight = 2;
    const wallThickness = 0.5;
    const wallYOffset = wallHeight / 2 - 0.1;

    // Left wall
    const leftWallLocalPos = new THREE.Vector3(-width/2 - wallThickness/2, wallYOffset, 0);
    const leftWallWorldPos = position.clone().add(leftWallLocalPos.clone().applyQuaternion(pieceRotation));
    createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: length}, position: leftWallWorldPos, quaternion: pieceRotation, color: 0x444444, info: { type: 'wall' }});

    // Right wall
    const rightWallLocalPos = new THREE.Vector3(width/2 + wallThickness/2, wallYOffset, 0);
    const rightWallWorldPos = position.clone().add(rightWallLocalPos.clone().applyQuaternion(pieceRotation));
    createTrackPiece(scene, world, {size: {x: wallThickness, y: wallHeight, z: length}, position: rightWallWorldPos, quaternion: pieceRotation, color: 0x444444, info: { type: 'wall' }});

    const endOffset = new THREE.Vector3(0, -length * Math.sin(slopeAngle), length * Math.cos(slopeAngle));
    const endPosition = startPosition.clone().add(endOffset.applyQuaternion(startRotation));

    return { endPosition, endRotation: startRotation };
}

function createTurn(scene, world, { width, angle }, startPosition, startRotation) {
    const turnAngleRad = angle * (Math.PI / 180);
    const isRightTurn = angle > 0;
    
    // The pivot point for the turn, relative to the start position.
    // For a right turn, it's to the right; for a left, it's to the left.
    const pivotOffset = new THREE.Vector3(isRightTurn ? width / 2 : -width / 2, 0, 0);
    const worldPivotOffset = pivotOffset.clone().applyQuaternion(startRotation);
    const pivotPoint = startPosition.clone().add(worldPivotOffset);

    // The center of the square track piece is offset from the start, not the pivot.
    const centerOffset = new THREE.Vector3(0, 0, width / 2);
    const worldCenterOffset = centerOffset.clone().applyQuaternion(startRotation);
    const position = startPosition.clone().add(worldCenterOffset);
    
    // Create the main floor of the turn
    createTrackPiece(scene, world, {
        size: { x: width, y: 0.2, z: width },
        position,
        quaternion: startRotation, // The base piece is aligned with the entry
        color: 0x55ff55,
        info: { type: 'turn', angle }
    });

    // --- Add Walls ---
    const wallHeight = 8; // Doubled again from 4 to 8
    const wallThickness = 0.5;
    const numSegments = 10;
    const segmentAngle = turnAngleRad / numSegments;
    const wallYOffset = wallHeight / 2 - 0.1;

    const createWall = (radius) => {
        // Use a precise segment length without overlap
        const segmentLength = 2 * radius * Math.tan(Math.abs(segmentAngle) / 2);

        for (let i = 0; i < numSegments; i++) {
            const angleForSegmentCenter = (i + 0.5) * segmentAngle;

            const segmentRotation = startRotation.clone().multiply(
                new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angleForSegmentCenter)
            );

            // Center the rails within the green square by using position (center of square) as reference
            // Vector from the center of the square to the wall position
            const localWallVector = new THREE.Vector3(isRightTurn ? radius : -radius, 0, 0);
            
            // Rotate this vector by the segment angle
            const rotatedLocalVector = localWallVector.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleForSegmentCenter);
            
            // Apply world rotation and add to the center position of the square
            const worldRotatedVector = rotatedLocalVector.applyQuaternion(startRotation);
            const wallPos = position.clone().add(worldRotatedVector);
            wallPos.y += wallYOffset;

            createTrackPiece(scene, world, {
                size: { x: wallThickness, y: wallHeight, z: segmentLength }, 
                position: wallPos,
                quaternion: segmentRotation,
                color: 0x444444,
                info: { type: 'wall' }
            });
        }
    };
    
    // Outer Wall - centered within the square
    createWall(width / 4 + wallThickness / 2);

    // Inner Wall - centered within the square
    createWall(width / 4 - wallThickness / 2);

    // Calculate the end rotation by applying the full turn angle
    const endRotation = startRotation.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turnAngleRad));
    
    // The end position is calculated relative to the start position, then rotated.
    const endOffset = new THREE.Vector3(isRightTurn ? width : -width, 0, width);
    const rotatedEndOffset = endOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (isRightTurn ? 0 : turnAngleRad)); // special handling for left turn rotation
    const worldRotatedEndOffset = rotatedEndOffset.clone().applyQuaternion(startRotation);

    // The final end position needs to be calculated differently.
    // Let's calculate it from the entry point, rotated around the pivot.
    const entryToPivot = startPosition.clone().sub(pivotPoint);
    const exitToPivot = entryToPivot.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngleRad);
    const endPosition = pivotPoint.clone().add(exitToPivot);
    
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