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
const DISPERSION_FACTOR = 10_000; // factor of 10 used to disperse starfield
const PARTICLE_COUNT = 1_000_000; // number of stars to generate (actual number is N/3)

// Create a new scene.
const scene = new THREE.Scene();

// Set the type of camera we wish to use.
const camera = new THREE.PerspectiveCamera(
  70, // field of view
  window.innerWidth / window.innerHeight, // screen aspect ratio
  0.1, // closest object that can be rendered
  10_000 // farthest object that can be rendered
);

// Move the camera above and farther way from the screen's centre.
camera.position.set(902, -946, -732);

//
// Starfield.
//

// Load a textured skybox as a background.
/* const skyLoader = new THREE.CubeTextureLoader();
scene.background = skyLoader.load([
  "assets/images/starfield.png",
  "assets/images/starfield.png",
  "assets/images/starfield.png",
  "assets/images/starfield.png",
  "assets/images/starfield.png",
  "assets/images/starfield.png",
]); */

const particleGeometry = new THREE.BufferGeometry(); // geometry for stars

// Each star is made up of a vertex. The array holds three values (as X,Y,Z
// coordinates) per vertex.
const vertices = new Float32Array(PARTICLE_COUNT * 3);

// Loop through all vertices and randomize their positions.
// Also, centre starfield and disperse across entire screen.
for (let i = 0; i < PARTICLE_COUNT * 3; ++i) {
  vertices[i] = (Math.random() - 0.5) * DISPERSION_FACTOR; // get values in range [-50:50]
}

// Geometry for stars.
particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(vertices, 3) // 3 values for each vertex
);

// Texture for stars.
const textureLoader = new THREE.TextureLoader();
const particleTexture = textureLoader.load("assets/images/star_small.png");

// Material for stars.
const particleMaterial = new THREE.PointsMaterial({
  map: particleTexture,
  size: 2, // star size
  sizeAttenuation: true, // star size reduces with camera distance
  color: 0xFFF_FFF, // same as daytime background
  transparent: true,
});

// Mesh for stars.
const particleMesh = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleMesh);

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

// Avoid pixelation on high resolution screens.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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
  new THREE.Color(0xFFF_FFF).convertLinearToSRGB(),
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
      color: new THREE.Color(0xFFC_B8E)
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
      color: new THREE.Color(0xFFC_B8E).convertSRGBToLinear(),
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
      color: new THREE.Color(0xFFC_B8E)
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

  let marsTextures = {
    map: await new THREE.TextureLoader().loadAsync("assets/images/marsmap.jpg"),
  };

  let jupiterTextures = {
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/jupitermap.jpg"
    ),
  };

  let saturnTextures = {
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/saturnmap.jpg"
    ),
  };

  let saturnRingTextures = {
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/saturnring.png"
    ),
  };

  let uranusTextures = {
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/uranusmap.jpg"
    ),
  };

  let uranusRingTextures = {
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/uranusring.png"
    ),
  };

  let neptuneTextures = {
    map: await new THREE.TextureLoader().loadAsync(
      "assets/images/neptunemap.jpg"
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
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
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
    new THREE.SphereGeometry(2.73, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: moonTextures.map, // sphere base colour
      bumpMap: moonTextures.bump, // make texture surface uneven
      bumpScale: 0.1, // size of the bumps
      envMap, // environmental map on sphere material
      envMapIntensity: 1.0, // environmental map effect strength
      sheen: 0.4,
      sheenRoughness: 1.0,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );
  luna.position.set(18, 4, 0);
  luna.sunEnvIntensity = 0.4;
  luna.MoonEnvIntensity = 0.1;
  luna.receiveShadow = true;
  earth.add(luna);

  // Render Mercury.
  let mercury = new THREE.Mesh(
    new THREE.SphereGeometry(3.83, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: mercuryTextures.map, // sphere base colour
      bumpMap: moonTextures.bump, // make texture surface uneven
      bumpScale: 0.1, // size of the bumps
      envMap, // environmental map on sphere material
      envMapIntensity: 1.0, // environmental map effect strength
      sheen: 0.4,
      sheenRoughness: 1.0,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );
  mercury.position.set(140, 3, 0);
  mercury.sunEnvIntensity = 0.4;
  mercury.MoonEnvIntensity = 0.1;
  mercury.receiveShadow = true;
  scene.add(mercury);

  // Render Venus.
  let venus = new THREE.Mesh(
    new THREE.SphereGeometry(9.5, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: venusTextures.map,
      envMap,
      envMapIntensity: 1.0,
      sheen: 1.4,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.5,
    })
  );
  venus.position.set(100, 3, 0);
  venus.sunEnvIntensity = 0.4;
  venus.MoonEnvIntensity = 0.1;
  venus.receiveShadow = true;
  scene.add(venus);

  // Render Mars.
  let mars = new THREE.Mesh(
    new THREE.SphereGeometry(5.32, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: marsTextures.map,
      envMap,
      envMapIntensity: 1.0,
      sheen: 0.2,
      sheenRoughness: 1.4,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.2,
    })
  );
  mars.position.set(-60, -3, 0);
  mars.sunEnvIntensity = 0.4;
  mars.MoonEnvIntensity = 0.1;
  mars.receiveShadow = true;
  scene.add(mars);

  // Render Jupiter.
  let jupiter = new THREE.Mesh(
    new THREE.SphereGeometry(109.73, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: jupiterTextures.map,
      envMap,
      envMapIntensity: 1.0,
      sheen: 0.2,
      sheenRoughness: 1.4,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.2,
    })
  );
  jupiter.position.set(-280, 20, 3);
  jupiter.sunEnvIntensity = 0.4;
  jupiter.MoonEnvIntensity = 0.1;
  jupiter.receiveShadow = true;
  scene.add(jupiter);

  // Render Saturn.
  let saturn = new THREE.Mesh(
    new THREE.SphereGeometry(91.4, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: saturnTextures.map,
      envMap,
      envMapIntensity: 1.0,
      sheen: 0.2,
      sheenRoughness: 1.4,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.2,
    })
  );
  saturn.position.set(-700, 20, 3);
  saturn.rotateOnWorldAxis(
    new THREE.Vector3(randomize(), 0.03).normalize(),
    17.5
  );
  saturn.sunEnvIntensity = 0.4;
  saturn.MoonEnvIntensity = 0.1;
  saturn.receiveShadow = true;
  scene.add(saturn);

  // Render Saturnian rings.
  let saturnRing = new THREE.Mesh(
    new THREE.RingGeometry(91.4, 182.8, 70),
    new THREE.MeshPhysicalMaterial({
      map: saturnRingTextures.map,
      side: THREE.DoubleSide,
      envMap,
      envMapIntensity: 1.0,
      sheen: 0.2,
      sheenRoughness: 1.4,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.2,
    })
  );
  saturnRing.sunEnvIntensity = 0.4;
  saturnRing.MoonEnvIntensity = 0.1;
  saturnRing.receiveShadow = true;
  saturn.add(saturnRing);

  // Render Uranus.
  let uranus = new THREE.Mesh(
    new THREE.SphereGeometry(39.81, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: uranusTextures.map,
      envMap,
      envMapIntensity: 1.0,
      sheen: 0.2,
      sheenRoughness: 1.4,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.2,
    })
  );
  uranus.position.set(-1000, 20, 0);
  uranus.rotateOnWorldAxis(new THREE.Vector3(0, 0.19).normalize(), 17.5);
  uranus.sunEnvIntensity = 0.4;
  uranus.MoonEnvIntensity = 0.1;
  uranus.receiveShadow = true;
  scene.add(uranus);

  // Render Uranian rings.
  let uranusRing = new THREE.Mesh(
    new THREE.RingGeometry(69.62, 79.62, 70),
    new THREE.MeshPhysicalMaterial({
      map: uranusRingTextures.map,
      side: THREE.DoubleSide,
      envMap,
      envMapIntensity: 1.0,
      sheen: 0.2,
      sheenRoughness: 1.4,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.2,
    })
  );
  uranusRing.sunEnvIntensity = 0.4;
  uranusRing.MoonEnvIntensity = 0.1;
  uranusRing.receiveShadow = true;
  uranus.add(uranusRing);

  // Render Neptune.
  let neptune = new THREE.Mesh(
    new THREE.SphereGeometry(38.65, 70, 70),
    new THREE.MeshPhysicalMaterial({
      map: neptuneTextures.map,
      envMap,
      envMapIntensity: 1.0,
      sheen: 0.2,
      sheenRoughness: 1.4,
      sheenColor: new THREE.Color(0x696_E46).convertSRGBToLinear(),
      clearcoat: 0.4,
    })
  );
  neptune.position.set(-1160, 20, 0);
  neptune.sunEnvIntensity = 0.4;
  neptune.MoonEnvIntensity = 0.1;
  neptune.receiveShadow = true;
  scene.add(neptune);

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

    // Rotational speeds are relative to Earth's.
    //
    // If a planet's rotational speed is slower than Earth's, we divide Earth's
    // speed by a factor; if faster than Earth's, we multiply it by a factor.
    // These factors are based on each planet's sidereal rotational period (the
    // length of each planet's day in Earth hours).
    //
    // I've sped up Venus and Mercury up since their rotational periods are so
    // slow relative to Earth that they wouldn't appear to rotate at all if I
    // was aiming for realism.
    //
    // Axial rotation is relative to the sun.
    //
    // We add to the Y axis if a planet rotates clockwise on its axis, and
    // subtract if a planet rotates counterclockwise.

    earth.rotation.y += ROTATIONAL_SPEED; // rotate Earth counterclockwise on its axis.
    mercury.rotation.y += ROTATIONAL_SPEED / 1.6;
    venus.rotation.y -= ROTATIONAL_SPEED / 2.5;
    mars.rotation.y += ROTATIONAL_SPEED;
    jupiter.rotation.y += ROTATIONAL_SPEED * 2.4;
    saturn.rotation.z += ROTATIONAL_SPEED * 2.3;
    uranus.rotation.z -= ROTATIONAL_SPEED * 1.4;
    neptune.rotation.y += ROTATIONAL_SPEED * 1.5;

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
  "63B598", "CE7D78", "EA9E70", "A48A9E", "C6E1E8", "648177", "0D5AC1",
  "F205E6", "1C0365", "14A9AD", "4CA2F9", "A4E43F", "D298E2", "6119D0",
  "D2737D", "C0A43C", "F2510E", "651BE6", "79806E", "61DA5E", "CD2F00",
  "9348AF", "01AC53", "C5A4FB", "996635", "B11573", "4BB473", "75D89E",
  "2F3F94", "2F7B99", "DA967D", "34891F", "B0D87B", "CA4751", "7E50A8",
  "C4D647", "E0EEB8", "11DEC1", "289812", "566CA0", "FFDBE1", "2F1179",
  "935B6D", "916988", "513D98", "AEAD3A", "9E6D71", "4B5BDC", "0CD36D",
  "250662", "CB5BEA", "228916", "AC3E1B", "DF514A", "539397", "880977",
  "F697C1", "BA96CE", "679C9D", "C6C42C", "5D2C52", "48B41B", "E1CF3B",
  "5BE4F0", "57C4D8", "A4D17A", "BE608B", "96B00C", "088BAF", "F158BF",
  "E145BA", "EE91E3", "05D371", "5426E0", "4834D0", "802234", "6749E8",
  "0971F0", "8FB413", "B2B4F0", "C3C89D", "C9A941", "41D158", "FB21A3",
  "51AED9", "5BB32D", "21538E", "89D534", "D36647", "7FB411", "0023B8",
  "3B8C2A", "986B53", "F50422", "983F7A", "EA24A3", "79352C", "521250",
  "C79ED2", "D6DD92", "E33E52", "B2BE57", "FA06EC", "1BB699", "6B2E5F",
  "64820F", "21538E", "89D534", "D36647", "7FB411", "0023B8", "3B8C2A",
  "986B53", "F50422", "983F7A", "EA24A3", "79352C", "521250", "C79ED2",
  "D6DD92", "E33E52", "B2BE57", "FA06EC", "1BB699", "6B2E5F", "64820F",
  "9CB64A", "996C48", "9AB9B7", "06E052", "E3A481", "0EB621", "FC458E",
  "B2DB15", "AA226D", "792ED8", "73872A", "520D3A", "CEFCB8", "A5B3D9",
  "7D1D85", "C4FD57", "F1AE16", "8FE22A", "EF6E3C", "243EEB", "DD93FD",
  "3F8473", "E7DBCE", "421F79", "7A3D93", "635F6D", "93F2D7", "9B5C2A",
  "15B9EE", "0F5997", "409188", "911E20", "1350CE", "10E5B1", "FFF4D7",
  "CB2582", "CE00BE", "32D5D6", "608572", "C79BC2", "00F87C", "77772A",
  "6995BA", "FC6B57", "F07815", "8FD883", "060E27", "96E591", "21D52E",
  "D00043", "B47162", "1EC227", "4F0F6F", "1D1D58", "947002", "BDE052",
  "E08C56", "28FCFD", "36486A", "D02E29", "1AE6DB", "3E464C", "A84A8F",
  "911E7E", "3F16D9", "0F525F", "AC7C0A", "B4C086", "C9D730", "30CC49",
  "3D6751", "FB4C03", "640FC1", "62C03E", "D3493A", "88AA0B", "406DF9",
  "615AF0", "2A3434", "4A543F", "79BCA0", "A8B8D4", "00EFD4", "7AD236",
  "7260D8", "1DEAA7", "06F43A", "823C59", "E3D94C", "DC1C06", "F53B2A",
  "B46238", "2DFFF6", "A82B89", "1A8011", "436A9F", "1A806A", "4CF09D",
  "C188A2", "67EB4B", "B308D3", "FC7E41", "AF3101", "71B1F4", "A2F8A5",
  "E23DD0", "D3486D", "00F7F9", "474893", "3CEC35", "1C65CB", "5D1D0C",
  "2D7D2A", "FF3420", "5CDD87", "A259A4", "E4AC44", "1BEDE6", "8798A4",
  "D7790F", "B2C24F", "DE73C2", "D70A9C", "88E9B8", "C2B0E2", "86E98F",
  "AE90E2", "1A806B", "436A9E", "0EC0FF", "F812B3", "B17FC9", "8D6C2F",
  "D3277A", "2CA1AE", "9685EB", "8A96C6", "DBA2E6", "76FC1B", "608FA4",
  "20F6BA", "07D7F6", "DCE77A", "77ECCA"
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
