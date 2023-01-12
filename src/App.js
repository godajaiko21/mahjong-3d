import './App.css';
import React, { useEffect, useState } from 'react'
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'dat.gui';
import { WINDS, POSITIONS, ROTATIONS, MAX_SEQUENCE } from './data';

const init = (setLoading) => {
  setLoading(true);

  const stats = initStats();

  // create a scene, that will hold all our elements such as objects, cameras and lights.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x000000 );

  // create a camera, which defines where we're looking at.
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.x = 0;
  camera.position.y = 100;
  camera.position.z = 75;
  camera.lookAt(0, 0, 100);

  // create a render and set the size
  const renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(new THREE.Color(0xEEEEEE));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  // set OrbitControls
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.autoRotate = false;

  // add subtle ambient lighting
  const ambientLight = new THREE.AmbientLight(0x0c0c0c);
  const spotLightTop = new THREE.SpotLight(0xffffff);
  const spotLightEast = new THREE.SpotLight(0xffffff);
  const spotLightSouth = new THREE.SpotLight(0xffffff);
  const spotLightWest = new THREE.SpotLight(0xffffff);
  const spotLightNorth = new THREE.SpotLight(0xffffff);
  spotLightTop.position.set(0, 250, 0);
  spotLightTop.intensity = 1;
  spotLightEast.position.set(0, 200, 250);
  spotLightEast.intensity = 1;
  spotLightSouth.position.set(250, 200, 0);
  spotLightSouth.intensity = 1;
  spotLightWest.position.set(0, 200, -250);
  spotLightWest.intensity = 1;
  spotLightNorth.position.set(-250, 200, 0);
  spotLightNorth.intensity = 1;
  scene.add(ambientLight);
  scene.add(spotLightTop);
  scene.add(spotLightEast);
  scene.add(spotLightSouth);
  scene.add(spotLightWest);
  scene.add(spotLightNorth);

  // add the output of the renderer to the html element
  document.getElementById("WebGL-output").appendChild(renderer.domElement);

  // load objects
  const loader = new GLTFLoader()
  const autoTablePath = 'assets/AutoTable.glb';
  const startingPlayerCardPath = 'assets/StartingPlayerCard.glb';
  const tileSetPath = 'assets/TileSet.glb';


  let serveTiles = []

  loader.load(autoTablePath, (autoTableGltf) => {
    const autoTable = autoTableGltf.scene;
    autoTable.scale.set(100, 100, 100);
    autoTable.position.set(0, -60, 0);

    loader.load(startingPlayerCardPath, (startingPlayerCardGltf) => {
      const startingPlayerCard = startingPlayerCardGltf.scene;
      startingPlayerCard.scale.set(100, 100, 100);
      startingPlayerCard.position.set(24.6, 16.6, 35.6);

      loader.load(tileSetPath, (tileSetGltf) => {
        const tileSet = tileSetGltf.scene;
        tileSet.position.set(0, 16.6, 0);

        scene.add(autoTable);
        scene.add(startingPlayerCard);

        // 配牌生成
        let tiles = []
        tileSet.children.forEach(tile => {
          tile.scale.set(0.95, 0.8, 1.25);
          // 4枚ずつ入れる
          if (tile.name !== "Tile51" && tile.name !== "Tile52" && tile.name !== "Tile53") {
            tiles.push(tile.clone());
            tiles.push(tile.clone());
            tiles.push(tile.clone());
          }
          if (tile.name !== "Tile15" && tile.name !== "Tile25" && tile.name !== "Tile35") {
            tiles.push(tile.clone());
          }
        })
        let shuffledTiles = shuffle(tiles);
        // console.log(shuffledTiles.length)

        // 手牌生成
        WINDS.map(wind => {
          POSITIONS[wind]["HAND"].map(pos => {
            const handTile = shuffledTiles[0];
            shuffledTiles.shift();
            handTile.position.set(pos.x, pos.y, pos.z);
            const rot = ROTATIONS[wind]["HAND"];
            handTile.rotation.set(rot.x, rot.y, rot.z);
            scene.add(handTile);
            return true
          })
          return true
        })

        // 王牌生成
        const SERVE_WIND_ORDER = ["SOUTH", "EAST", "NORTH", "WEST"];
        SERVE_WIND_ORDER.map(wind => {
          POSITIONS[wind]["WALL"].map((pos, idx) => {
            const tile = shuffledTiles[0];
            shuffledTiles.shift();
            tile.position.set(pos.x, pos.y, pos.z);
            const rot = ROTATIONS[wind]["WALL"];
            tile.rotation.set(rot.x, rot.y, rot.z);
            if (wind === "WEST" && idx === 8) {
              tile.rotation.x += Math.PI;
            }
            if (wind !== "WEST") {
              serveTiles.push(tile);
            }
            scene.add(tile);
            return true
          })
          return true
        })
        // console.log(shuffledTiles.length)

        setLoading(false);
      });
    });
  });

  // Init dat.GUI
  const gui = new GUI();
  let beforeTsumo = true;
  let currentWind = "EAST";
  let currentSequence = 0;
  const PROPERTY = {'proceed': () => {
    if (currentSequence < MAX_SEQUENCE) {
      const currentTile = serveTiles[0];
      if (beforeTsumo) {
        const dstPos = POSITIONS[currentWind]["TSUMO"][0];
        const dstRot = ROTATIONS[currentWind]["TSUMO"];
        currentTile.position.set(dstPos.x, dstPos.y, dstPos.z);
        currentTile.rotation.set(dstRot.x, dstRot.y, dstRot.z);
  
        beforeTsumo = false;
      } else {
        const dstPos = POSITIONS[currentWind]["DISCARDED"][Math.floor(currentSequence / 4)];
        const dstRot = ROTATIONS[currentWind]["DISCARDED"];
        currentTile.position.set(dstPos.x, dstPos.y, dstPos.z);
        currentTile.rotation.set(dstRot.x, dstRot.y, dstRot.z);
        
        beforeTsumo = true;
        if (currentWind === "EAST") {
          currentWind = "SOUTH";
        } else if (currentWind === "SOUTH") {
          currentWind = "WEST";
        } else if (currentWind === "WEST") {
          currentWind = "NORTH";
        } else {
          currentWind = "EAST";
        }
        serveTiles.shift();
        currentSequence += 1;
      }
    }
  }}
  gui.add(PROPERTY, 'proceed')

  // render the scene
  render();

  function render() {
    stats.update();

    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  function initStats() {
    var stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms
    // Align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.getElementById("Stats-output").appendChild(stats.domElement);
    return stats;
  }

  window.addEventListener('resize', onResize, false);
}

const shuffle = ([...array]) => {
  for (let i = array.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init(setLoading);
  }, []);

  return (
    <div className="App">
      {loading ?
        <div id="loading">
          <div className="spinner"></div>
        </div>
      : ""}
      <div id="Stats-output" />
      <div id="WebGL-output" />
    </div>
  );
}

export default App;
