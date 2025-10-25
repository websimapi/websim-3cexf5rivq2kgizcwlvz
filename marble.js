import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Marble {
    constructor(username, color, position, scene, world) {
        this.username = username;
        this.radius = 1;

        // Create 3D mesh
        const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        scene.add(this.mesh);
        
        // Add username label
        this.label = this.createUsernameTexture(username);
        this.label.position.set(position.x, position.y + this.radius + 0.5, position.z);
        scene.add(this.label);

        // Create physics body
        const shape = new CANNON.Sphere(this.radius);
        this.body = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: shape
        });
        this.body.sleep(); // Start asleep
        world.addBody(this.body);
    }
    
    createUsernameTexture(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const size = 256;
        canvas.width = size;
        canvas.height = size / 2;
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '48px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(4, 2, 1);
        return sprite;
    }

    update() {
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
        this.label.position.set(
            this.body.position.x,
            this.body.position.y + this.radius + 0.5,
            this.body.position.z
        );
    }
}

