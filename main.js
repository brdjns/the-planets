// main.js: Planet generation.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

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

// Animation loop as an asynchronous function.
(async function () {
  let pmrem = new THREE.PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader()
    .setDataType(THREE.FloatType)
    .loadAsync("assets/hdri/abandoned_construction_4k.hdr");
  let envMap = pmrem.fromEquirectangular(envmapTexture).texture;

  let textures = {
    bump: await new THREE.TextureLoader().loadAsync(
      "assets/images/earthbump.jpg"
    ),
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/earthmap.jpg"
    ),
    spec: await new THREE.TextureLoader().loadAsync(
      "assets/images/earthspec.jpg"
    ),
    planeTrailMask: await new THREE.TextureLoader().loadAsync(
      "assets/images/mask.png"
    ),
  };

  // Select fire mesh of our plane.
  let plane = (await new GLTFLoader().loadAsync("assets/glb/plane.glb")).scene
    .children[0];
  let planesData = [makePlane(plane, textures.planeTrailMask, envMap, scene)];

  // Render a sphere.
  let sphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: textures.map, // sphere base colour
      roughnessMap: textures.spec, // roughness of sphere texture
      bumpMap: textures.bump, // make texture surface uneven
      bumpScale: 0.07, // size of the bumps
      envMap, // environmental map on sphere material
      envMapIntensity: 1.0, // environmental map effect strength
      sheen: 1.4,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color("#696e46").convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );
  sphere.rotation.y += Math.PI * 3.38; // rotate to Africa
  sphere.receiveShadow = true;
  scene.add(sphere);

  renderer.setAnimationLoop(() => {
    // Reset the position + rotation of every group every time we rerender the
    // scene.
    planesData.forEach((planeData) => {
      let plane = planeData.group;

      plane.position.set(0, 0, 0);
      plane.rotation.set(0, 0, 0);
      plane.updateMatrixWorld();

      // Translate plane on Y axis.
      plane.translateY(planeData.yOff);

      // Rotate plane 90 degrees.
      plane.rotateOnAxis(new THREE.Vector3(1, 0, 0), +Math.PI * 0.5);
    });

    controls.update();
    renderer.render(scene, camera);
  });
})();

// Make a plane.
function makePlane(planeMesh, trailTexture, envMap, scene) {
  let plane = planeMesh.clone(); // clone plane mesh
  plane.scale.set(0.001, 0.001, 0.001); // scale mesh down to manageable size

  // Reset default rotation and position for model.
  plane.position.set(0, 0, 0);
  plane.rotation.set(0, 0, 0);
  plane.updateMatrixWorld();

  // Apply shadows + environmental map to every child mesh in the model.
  plane.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.material.envMap = envMap;
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  // Group multiple meshes together.
  let group = new THREE.Group();

  // Add the plane to the group.
  group.add(plane);

  // Add the group to the scene.
  scene.add(group);

  // Translate the plane from the centre of the scene. We translate it within
  // the Y axis. The returned object gets stored in the planesData array.
  return {
    group,
    yOff: 10.5 + Math.random() * 1.0,
  };
}
