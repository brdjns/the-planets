// main.js: Planet generation.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Create a new scene.
const scene = new THREE.Scene();

// Set the type of camera we wish to use.
const camera = new THREE.PerspectiveCamera(
  45, // field of view
  window.innerWidth / window.innerHeight, // screen aspect ratio
  0.1, // closest object that can be rendered
  1000 // farthest object that can be rendered
);

// Move the camera above and farther way from the screen's centre.
camera.position.set(0, 15, 50);

// Set the renderer we wish to use.
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

// Set the size at we wish to render.
// It's a good idea to use the width and height of the area we want to fill
// with our app - in this case, the width and height of the browser window.
renderer.setSize(window.innerWidth, window.innerHeight);

// Set tone mapping.
renderer.toneMapping = THREE.ACESFilmicToneMapping;

// We want our final colour calues in sRGB because our images are sRGB-encoded.
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Physically-correct lighting.
renderer.useLegacyLights = false;

// Add shadow maps.
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Append to the document.
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // centre the scene
controls.dampingFactor = 0.05;
controls.enableDamping = true; // inertia!


// Sunlight properties.
const sunLight = new THREE.DirectionalLight(new THREE.Color("#ffffff"), 3.5);
sunLight.position.set(10, 20, 10); // Position on top right-hand side of the screen.
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 512;
sunLight.shadow.mapSize.height = 512;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -10;
sunLight.shadow.camera.bottom = -10;
sunLight.shadow.camera.top = 10;
sunLight.shadow.camera.right = 10;
scene.add(sunLight);

// Render a sphere.
let sphere = new THREE.Mesh(
  new THREE.SphereGeometry(10, 70, 70),
  new THREE.MeshPhysicalMaterial({})
);

sphere.receiveShadow = true;
scene.add(sphere);

// Animation loop as an asynchronous function.
(async function () {
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
})();
