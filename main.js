// main.js: Planet generation.

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Constants.
const MINIMUM_RADIUS = 0.2;

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

//
// Rings
//

const ringScene = new THREE.Scene();
const ringsCamera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
ringsCamera.position.set(0, 0, 50);

//
// Audio
//

// Get around modern browsers refusing to autoplay sound.
// This works in Edge but not in Firefox (which no-one but me uses, anyway).
let context = undefined;
const div = document.querySelector(".sun-background");
window.onload = () => {
  context = new AudioContext();
};

div.addEventListener("mouseover", () => {
  context.resume().then(() => {});
});

const listener = new THREE.AudioListener(); // listen for all scene audio
camera.add(listener);
const sound = new THREE.Audio(listener); // create sound source
scene.add(sound);
const loader = new THREE.AudioLoader(); // load all sound files

// Load the plane sound.
loader.load("assets/audio/prop_plane.mp3", (buffer) => {
  sound.setBuffer(buffer); // set source to sound object's buffer
  sound.setVolume(1); // set the volume (range is 0:1)
  sound.setLoop(true); // always loop
  sound.play();
});

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

let mousePos = new THREE.Vector2(0, 0);

// Zero X and Y coördinates when the mouse is centred on the screen.
window.addEventListener("mousemove", (e) => {
  let x = e.clientX - window.innerWidth * 0.5;
  let y = e.clientY - window.innerHeight * 0.5;

  mousePos.x = x * 0.0003;
  mousePos.y = y * 0.0003;
});

// Animation loop as an asynchronous function.
(async function () {
  let pmrem = new THREE.PMREMGenerator(renderer);
  let envmapTexture = await new RGBELoader()
    .setDataType(THREE.FloatType)
    .loadAsync("assets/hdri/abandoned_construction_4k.hdr");
  let envMap = pmrem.fromEquirectangular(envmapTexture).texture;

  // Rings.
  const ring1 = new THREE.Mesh(
    new THREE.RingGeometry(15, 13.5, 80, 1, 0),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffcb8e")
        .convertSRGBToLinear()
        .multiplyScalar(200),
      roughness: 0.25,
      envMap,
      envMapIntensity: 1.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    })
  );
  ringScene.add(ring1);

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(16.5, 15.75, 80, 1, 0),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffcb8e").convertSRGBToLinear(),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  ringScene.add(ring2);

  const ring3 = new THREE.Mesh(
    new THREE.RingGeometry(18, 17.75, 80),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffcb8e")
        .convertSRGBToLinear()
        .multiplyScalar(50),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );
  ringScene.add(ring3);

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
  let planesData = [
    makePlane(plane, textures.planeTrailMask, envMap, scene),
    /*makePlane(plane, textures.planeTrailMask, envMap, scene),*/
  ];

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

  let clock = new THREE.Clock();

  renderer.setAnimationLoop(() => {
    // Elapsed time since the last frame.
    let delta = clock.getDelta();

    // Reset the position + rotation of every group every time we rerender the
    // scene.
    planesData.forEach((planeData) => {
      let plane = planeData.group;

      plane.position.set(0, 0, 0);
      plane.rotation.set(0, 0, 0);
      plane.updateMatrixWorld();

      //
      // The following statements read bottom to top.
      //

      // How much we've rotated the plane.
      planeData.rot += delta * 0.25;
      /*planeData.rot += delta * 0; // freeze plane*/

      // Rotate plane along a random axis by a random rotation.
      plane.rotateOnAxis(planeData.randomAxis, planeData.randomAxisRot);

      // Rotate plane along the Y axis by rotation amount.
      plane.rotateOnAxis(new THREE.Vector3(0, 1, 0), planeData.rot);

      // Rotate plane along the Z axis by radius amount.
      plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planeData.rad);

      // Translate plane on Y axis.
      plane.translateY(planeData.yOff);

      // Rotate plane 90 degrees to compensate for it pointing downwards after
      // applying position and rotation above.
      plane.rotateOnAxis(new THREE.Vector3(1, 0, 0), +Math.PI * 0.5);
    });

    controls.update();
    renderer.render(scene, camera);

    // Rotate each ring by a value that depends on the mouse position.
    // Take 95% of the previous value stored in 'x' and add 5% of mouse
    // position along the Y axis.
    // The rightmost value dictates strength of rotation (bigger number: more rotation).

    ring1.rotation.x = ring1.rotation.x * 0.95 + mousePos.y * 0.05 * 1.2;
    ring1.rotation.y = ring1.rotation.y * 0.95 + mousePos.x * 0.05 * 1.2;

    ring2.rotation.x = ring2.rotation.x * 0.95 + mousePos.y * 0.05 * 0.375;
    ring2.rotation.y = ring2.rotation.y * 0.95 + mousePos.x * 0.05 * 0.375;

    // Rotate this ring in the opposite direction to the others.
    ring3.rotation.x = ring3.rotation.x * 0.95 - mousePos.y * 0.05 * 0.275;
    ring3.rotation.y = ring3.rotation.y * 0.95 - mousePos.x * 0.05 * 0.275;

    renderer.autoClear = false; // don't clear screen before next render
    renderer.render(ringScene, ringsCamera);
    renderer.autoClear = true;
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

  // Add trail mesh.
  let trail = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 2),
    new THREE.MeshPhysicalMaterial({
      envMap,
      envMapIntensity: 3,

      roughness: 0.4,
      metalness: 0,
      transmission: 1,

      transparent: true,
      opacity: 1,
      alphaMap: trailTexture, // controls a trail's pixel opacity
    })
  );

  trail.rotateX(Math.PI);
  trail.translateY(1.1);

  // Group multiple meshes together.
  let group = new THREE.Group();

  // Add the plane to the group.
  group.add(plane);

  // Add the trail to the group.
  group.add(trail);

  // Add the group to the scene.
  scene.add(group);

  // Translate the plane from the centre of the scene. We translate it within
  // the Y axis. The returned object gets stored in the planesData array.
  return {
    group,
    // Set rotation between 0°-360°: 2πr circum. of a circle).
    rot: Math.random() * Math.PI * 2.0,
    rad: Math.random() * Math.PI * 0.45 + MINIMUM_RADIUS,
    yOff: Math.random() * 1.0 + 10.5,
    randomAxis: new THREE.Vector3(nr(), nr()).normalize(), // normalisation sets vector length to 1
    /*randomAxisRot: 0,*/
    randomAxisRot: Math.random() * Math.PI * 2,
  };
}

// Choose a random axis.
// Return a random number in the range -1:1.
function nr() {
  return Math.random() * 2 - 1;
}
