import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTrack(scene, world) {
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
    const physicsMaterial = new CANNON.Material('trackMaterial');

    const createSegment = (width, height, depth, position, rotation = {x: 0, y: 0, z: 0}) => {
        // Visual
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, trackMaterial);
        mesh.position.copy(position);
        mesh.quaternion.setFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z));
        scene.add(mesh);
        
        // Physics
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({
            mass: 0, // static
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: shape,
            material: physicsMaterial
        });
        body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);
        world.addBody(body);

        return { mesh, body };
    };

    // Starting platform
    createSegment(10, 1, 10, {x: 0, y: 24.5, z: -45});

    // Simple downward slope
    createSegment(10, 1, 100, {x: 0, y: 12, z: 0}, {x: -Math.PI / 16});
    
    // Walls
    createSegment(1, 4, 100, {x: -5.5, y: 14.5, z: 0}, {x: -Math.PI / 16});
    createSegment(1, 4, 100, {x: 5.5, y: 14.5, z: 0}, {x: -Math.PI / 16});


    return {
        // expose parts of the track if needed
    };
}

