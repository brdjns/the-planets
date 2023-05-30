// main.js: Planet generation.
// SPDX-License-Identifier: MIT

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import anime from "animejs/lib/anime.es.js";

// Animate backgrounds.
let sunBackground = document.querySelector(".sun-background");
let moonBackground = document.querySelector(".moon-background");

// Constants.
const MINIMUM_RADIUS = 0.2; // minimum radius for a plane to circle
const ROTATIONAL_SPEED = 0.002; // speed of planetary axial rotation
const MOUSE_Y_OFFSET = 0.0003; // offset for mouse position on Y axis
const MOUSE_X_OFFSET = 0.0003; // offset for mouse position on X axis
const DAMP_FACTOR = 0.05; // control damping factor
const PIXELS_LEFT_EDGE = 200; // number of pixels from left screen edge
const PIXELS_RIGHT_EDGE = 200; // number of pixels from right screen edge

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

// Load a textured skybox as a background.
const skyLoader = new THREE.CubeTextureLoader();
scene.background = skyLoader.load([
  "assets/images/starfield.png",
  "assets/images/starfield.png",
  "assets/images/starfield.png",
  "assets/images/starfield.png",
  "assets/images/starfield.png",
  "assets/images/starfield.png",
]);

//
// Rings
//

const ringScene = new THREE.Scene();
const ringsCamera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
ringsCamera.position.set(0, 0, 20);

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

div.addEventListener("mousemove", () => {
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

// Add controls.
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // centre the scene
controls.dampingFactor = DAMP_FACTOR;
controls.enableDamping = true; // inertia!

// Sunlight properties.
const sunLight = new THREE.DirectionalLight(new THREE.Color("#ffffff"), 3.5);
sunLight.position.set(10, 20, 10); // position on top right-hand side of the screen
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

// Moonlight properties.
const moonLight = new THREE.DirectionalLight(
  new THREE.Color("#ffffff").convertLinearToSRGB(),
  0
);
moonLight.position.set(-10, 20, 10); // position on top left-hand side of the screen
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 512;
moonLight.shadow.mapSize.height = 512;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 100;
moonLight.shadow.camera.left = -10;
moonLight.shadow.camera.bottom = -10;
moonLight.shadow.camera.top = 10;
moonLight.shadow.camera.right = 10;
scene.add(moonLight);

/* const helper = new THREE.CameraHelper(light.shadow.camera);
scene.add(helper); */

let mousePos = new THREE.Vector2(0, 0);

// Zero X and Y coördinates when the mouse is centred on the screen.
window.addEventListener("mousemove", (e) => {
  let x = e.clientX - window.innerWidth * 0.5;
  let y = e.clientY - window.innerHeight * 0.5;

  mousePos.x = x * MOUSE_X_OFFSET;
  mousePos.y = y * MOUSE_Y_OFFSET;
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

  // Change opacity of rings when doing night/day transition.
  ring1.sunOpacity = 0.35;
  ring1.moonOpacity = 0.03;
  ringScene.add(ring1);

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(16.5, 15.75, 80, 1, 0),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ffcb8e").convertSRGBToLinear(),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );

  // Change opacity of rings when doing night/day transition.
  ring2.sunOpacity = 0.35;
  ring2.moonOpacity = 0.1;
  ringScene.add(ring2);

  const ring3 = new THREE.Mesh(
    new THREE.RingGeometry(18, 17.75, 80),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color("#ffcb8e")
        .convertSRGBToLinear()
        .multiplyScalar(50),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    })
  );

  // Change opacity of rings when doing night/day transition.
  ring3.sunOpacity = 0.35;
  ring3.moonOpacity = 0.03;
  ringScene.add(ring3);

  //
  // Planetary textures.
  //

  let earthTextures = {
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

  let moonTextures = {
    bump: await new THREE.TextureLoader().loadAsync(
      "assets/images/moon_displ_map_8bit.jpg"
    ),
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/moon_textmap_1k.jpg"
    ),
  };

  let mercuryTextures = {
    bump: await new THREE.TextureLoader().loadAsync(
      // Mercury and Luna aren't that far off in appearance, so this is okay.
      "assets/images/moon_displ_map_8bit.jpg"
    ),
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/mercurymap.jpg"
    ),
  };

  let venusTextures = {
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/venusmap.jpg"
    ),
  };

  // Select fire mesh of our plane.
  let plane = (await new GLTFLoader().loadAsync("assets/glb/plane.glb")).scene
    .children[0];
  let planesData = [
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
    makePlane(plane, earthTextures.planeTrailMask, envMap, scene),
  ];

  // Render Earth.
  let earth = new THREE.Mesh(
    new THREE.SphereGeometry(10, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: earthTextures.map, // sphere base colour
      roughnessMap: earthTextures.spec, // roughness of sphere texture
      bumpMap: earthTextures.bump, // make texture surface uneven
      bumpScale: 0.07, // size of the bumps
      envMap, // environmental map on sphere material
      envMapIntensity: 1.0, // environmental map effect strength
      sheen: 1.4,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color("#696e46").convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );

  // Intensity of sun and moon environmental map.
  // We want a big difference between night and day.
  earth.sunEnvIntensity = 0.4;
  earth.MoonEnvIntensity = 0.1;

  // Give Earth axial tilt.
  earth.rotation.y += Math.PI * 3.38; // rotate to Africa

  earth.receiveShadow = true;
  scene.add(earth);

  // Render Luna.
  let luna = new THREE.Mesh(
    new THREE.SphereGeometry(2, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: moonTextures.map, // sphere base colour
      bumpMap: moonTextures.bump, // make texture surface uneven
      bumpScale: 0.1, // size of the bumps
      envMap, // environmental map on sphere material
      envMapIntensity: 1.0, // environmental map effect strength
      sheen: 0.4,
      sheenRoughness: 1.0,
      sheenColor: new THREE.Color("#696e46").convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );
  luna.position.set(20, 4, 3);
  luna.rotateOnWorldAxis(
    new THREE.Vector3(randomize(), randomize()).normalize(),
    24.5
  );
  luna.sunEnvIntensity = 0.4;
  luna.MoonEnvIntensity = 0.1;
  luna.receiveShadow = true;
  scene.add(luna);

  // Render Mercury.
  let mercury = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: mercuryTextures.map, // sphere base colour
      bumpMap: moonTextures.bump, // make texture surface uneven
      bumpScale: 0.1, // size of the bumps
      envMap, // environmental map on sphere material
      envMapIntensity: 1.0, // environmental map effect strength
      sheen: 0.4,
      sheenRoughness: 1.0,
      sheenColor: new THREE.Color("#696e46").convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );
  mercury.position.set(25, 14, 3);
  mercury.rotateOnWorldAxis(
    new THREE.Vector3(randomize(), randomize()).normalize(),
    24.5
  );
  mercury.sunEnvIntensity = 0.4;
  mercury.MoonEnvIntensity = 0.1;
  mercury.receiveShadow = true;
  scene.add(mercury);

  // Render Venus.
  let venus = new THREE.Mesh(
    new THREE.SphereGeometry(9.0, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: venusTextures.map,
      envMap,
      envMapIntensity: 1.0,
      sheen: 1.4,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color("#696e46").convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );
  venus.position.set(29, -3, 12);
  venus.rotateOnWorldAxis(
    new THREE.Vector3(randomize(), randomize()).normalize(),
    17.5
  );
  venus.sunEnvIntensity = 0.4;
  venus.MoonEnvIntensity = 0.1;
  venus.receiveShadow = true;
  scene.add(venus);

  let clock = new THREE.Clock();

  let daytime = true; // true if daytime
  let animating = false; // true if animation is currently ongoing

  // Animate background on mouse movement.
  window.addEventListener("mousemove", (event) => {
    if (animating) {
      return; // do nothing if animation still ongoing
    }

    // Go from daytime to nighttime and back by swapping the transparency
    // array.
    //
    // This depends on where our mouse is on the screen. We transition to
    // nighttime if the cursor is at the right screen-edge and it's daytime.
    // Conversely we transition to daytime if the cursor is at the left
    // screen-edge and it's nighttime.

    let anim = undefined;
    if (event.clientX > window.innerWidth - PIXELS_RIGHT_EDGE && !daytime) {
      anim = [1, 0]; // become daytime
    } else if (event.clientX < PIXELS_LEFT_EDGE && daytime) {
      anim = [0, 1]; // become nighttime
    } else {
      return; // do nothing: cursor is at neither screen edge
    }

    animating = true;

    // Object to animate.
    let obj = { t: 0 }; // start at fully transparent background
    anime({
      targets: obj,
      t: anim,

      // Run when animation is done (like a destructor).
      complete: () => {
        animating = false;
        daytime = !daytime; // choose opposite of whatever daytime was
      },

      // Run on every frame where animation is being updated.
      update: () => {
        sunLight.intensity = 3.5 * (1 - obj.t); // 1 when animation starts
        moonLight.intensity = 3.5 * obj.t; // 0 when animation starts

        sunLight.position.setY(20 * (1 - obj.t));
        moonLight.position.setY(20 * obj.t);

        // Animate material sheen when doing night/day transition.
        earth.material.sheen = 1 - obj.t;

        // Change the environmental map intensity for all objects that are
        // meshes.
        scene.children.forEach((child) => {
          child.traverse((object) => {
            /* 
               We want to gradually change the intensity from 1 to 2.
               We adopt the following scheme, where t == level of transparency:
            
               1 * (1-t) + 2 * t
               1 * (1-0) + 2 * 0     = 1    <-- value at the animation's start
               1 * (1-0.5) + 2 * 0.5 = 1.5  <-- value at the animation's midpoint
               1 * (1-1) + 2 * 1     = 2    <-- value at the animation's end
            */
            if (object instanceof THREE.Mesh && object.material.envMap) {
              object.material.envMapIntensity =
                object.sunEnvIntensity * // we want this intensity at the start
                (1 - obj.t) *
                object.MoonEnvIntensity * // we want this intensity at the end
                obj.t;
            }
          });
        });

        sunBackground.style.opacity = 1 - obj.t;
        moonBackground.style.opacity = obj.t;
      },
      easing: "easeOutElastic(3, 0.7)", // https://animejs.com/documentation/#elasticEasing
      duration: 1500,
    });
  });

  renderer.setAnimationLoop(() => {
    // Elapsed time since the last frame.
    let delta = clock.getDelta();

    earth.rotation.y += ROTATIONAL_SPEED; // rotate Earth counterclockwise on its axis.
    luna.rotation.y += ROTATIONAL_SPEED * 3.5; // yes, I know that the Moon is tidally locked to Earth
    mercury.rotation.y += ROTATIONAL_SPEED / 2;
    venus.rotation.y += ROTATIONAL_SPEED / 1.8;

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
      planeData.rotation += delta * 0.25;
      /*planeData.rot += delta * 0; // freeze plane*/

      // Rotate plane along a random axis by a random rotation.
      plane.rotateOnAxis(planeData.randomAxis, planeData.randomAxisRot);

      // Rotate plane along the Y axis by rotation amount.
      plane.rotateOnAxis(new THREE.Vector3(0, 1, 0), planeData.rotation);

      // Rotate plane along the Z axis by radius amount.
      plane.rotateOnAxis(new THREE.Vector3(0, 0, 1), planeData.radius);

      // Translate plane on Y axis.
      plane.translateY(planeData.yOffset);

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

// prettier-ignore
// For colour randomisation.
let colourArray = [
  "63b598", "ce7d78", "ea9e70", "a48a9e", "c6e1e8", "648177", "0d5ac1",
  "f205e6", "1c0365", "14a9ad", "4ca2f9", "a4e43f", "d298e2", "6119d0",
  "d2737d", "c0a43c", "f2510e", "651be6", "79806e", "61da5e", "cd2f00",
  "9348af", "01ac53", "c5a4fb", "996635", "b11573", "4bb473", "75d89e",
  "2f3f94", "2f7b99", "da967d", "34891f", "b0d87b", "ca4751", "7e50a8",
  "c4d647", "e0eeb8", "11dec1", "289812", "566ca0", "ffdbe1", "2f1179",
  "935b6d", "916988", "513d98", "aead3a", "9e6d71", "4b5bdc", "0cd36d",
  "250662", "cb5bea", "228916", "ac3e1b", "df514a", "539397", "880977",
  "f697c1", "ba96ce", "679c9d", "c6c42c", "5d2c52", "48b41b", "e1cf3b",
  "5be4f0", "57c4d8", "a4d17a", "be608b", "96b00c", "088baf", "f158bf",
  "e145ba", "ee91e3", "05d371", "5426e0", "4834d0", "802234", "6749e8",
  "0971f0", "8fb413", "b2b4f0", "c3c89d", "c9a941", "41d158", "fb21a3",
  "51aed9", "5bb32d", "21538e", "89d534", "d36647", "7fb411", "0023b8",
  "3b8c2a", "986b53", "f50422", "983f7a", "ea24a3", "79352c", "521250",
  "c79ed2", "d6dd92", "e33e52", "b2be57", "fa06ec", "1bb699", "6b2e5f",
  "64820f", "21538e", "89d534", "d36647", "7fb411", "0023b8", "3b8c2a",
  "986b53", "f50422", "983f7a", "ea24a3", "79352c", "521250", "c79ed2",
  "d6dd92", "e33e52", "b2be57", "fa06ec", "1bb699", "6b2e5f", "64820f",
  "9cb64a", "996c48", "9ab9b7", "06e052", "e3a481", "0eb621", "fc458e",
  "b2db15", "aa226d", "792ed8", "73872a", "520d3a", "cefcb8", "a5b3d9",
  "7d1d85", "c4fd57", "f1ae16", "8fe22a", "ef6e3c", "243eeb", "dd93fd",
  "3f8473", "e7dbce", "421f79", "7a3d93", "635f6d", "93f2d7", "9b5c2a",
  "15b9ee", "0f5997", "409188", "911e20", "1350ce", "10e5b1", "fff4d7",
  "cb2582", "ce00be", "32d5d6", "608572", "c79bc2", "00f87c", "77772a",
  "6995ba", "fc6b57", "f07815", "8fd883", "060e27", "96e591", "21d52e",
  "d00043", "b47162", "1ec227", "4f0f6f", "1d1d58", "947002", "bde052",
  "e08c56", "28fcfd", "36486a", "d02e29", "1ae6db", "3e464c", "a84a8f",
  "911e7e", "3f16d9", "0f525f", "ac7c0a", "b4c086", "c9d730", "30cc49",
  "3d6751", "fb4c03", "640fc1", "62c03e", "d3493a", "88aa0b", "406df9",
  "615af0", "2a3434", "4a543f", "79bca0", "a8b8d4", "00efd4", "7ad236",
  "7260d8", "1deaa7", "06f43a", "823c59", "e3d94c", "dc1c06", "f53b2a",
  "b46238", "2dfff6", "a82b89", "1a8011", "436a9f", "1a806a", "4cf09d",
  "c188a2", "67eb4b", "b308d3", "fc7e41", "af3101", "71b1f4", "a2f8a5",
  "e23dd0", "d3486d", "00f7f9", "474893", "3cec35", "1c65cb", "5d1d0c",
  "2d7d2a", "ff3420", "5cdd87", "a259a4", "e4ac44", "1bede6", "8798a4",
  "d7790f", "b2c24f", "de73c2", "d70a9c", "88e9b8", "c2b0e2", "86e98f",
  "ae90e2", "1a806b", "436a9e", "0ec0ff", "f812b3", "b17fc9", "8d6c2f",
  "d3277a", "2ca1ae", "9685eb", "8a96c6", "dba2e6", "76fc1b", "608fa4",
  "20f6ba", "07d7f6", "dce77a", "77ecca"
];

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

      // Intensity of plane environmental map.
      object.sunEnvIntensity = 1;
      object.MoonEnvIntensity = 0.3;
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

      // Traverse the colour array and randomise colours.
      // We interpolate the resulting expression and treat it as a hexadecimal number.
      color: new THREE.Color().setHex(
        `0x${colourArray[Math.floor(Math.random() * colourArray.length)]}`
      ),
      roughness: 0.4,
      metalness: 0,
      transmission: 1,

      transparent: true,
      opacity: 1,
      alphaMap: trailTexture, // controls a trail's pixel opacity
    })
  );

  // Intensity of trail environmental map.
  trail.sunEnvIntensity = 3;
  trail.MoonEnvIntensity = 0.7;
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
    rotation: Math.random() * Math.PI * 2.0,
    radius: Math.random() * Math.PI * 0.45 + MINIMUM_RADIUS,
    yOffset: Math.random() * 1.0 + 10.5,
    // normalisation sets vector length to 1
    randomAxis: new THREE.Vector3(randomize(), randomize()).normalize(),
    /*randomAxisRot: 0,*/
    randomAxisRot: Math.random() * Math.PI * 2,
  };
}

// Choose a random axis.
// Return a random number in the range -1:1.
function randomize() {
  return Math.random() * 2 - 1;
}
