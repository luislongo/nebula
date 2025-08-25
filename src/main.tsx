import { createRoot } from 'react-dom/client';
import * as Three from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import './index.css';
import { Puzzle } from './Puzzle';

const blocksInit = [
  {
    x: 0,
    y: 0,
    isHorizontal: true,
    length: 2,
  },
  {
    x: 3,
    y: 3,
    isHorizontal: false,
    length: 1,
  },
  {
    x: 1,
    y: 1,
    isHorizontal: true,
    length: 2,
  },
  {
    x: 2,
    y: 0,
    isHorizontal: false,
    length: 3,
  },
  {
    x: 0,
    y: 2,
    isHorizontal: false,
    length: 2,
  },
  {
    x: 3,
    y: 1,
    isHorizontal: false,
    length: 2,
  },
  {
    x: 1,
    y: 4,
    isHorizontal: true,
    length: 2,
  }
];
const size = 5;

createRoot(document.getElementById('root')!).render(
  <>
    <Puzzle size={size} blocks={blocksInit} />
  </>
)

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const renderer = new Three.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new Three.Scene();
scene.background = new Three.Color(0xaaaaaa);
const camera = new Three.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

new OrbitControls(camera, renderer.domElement);

type GraphNode = {
  id: string;
  label: string;
  velocity: Three.Vector3;
  acceleration: Three.Vector3;
  mesh: Three.Mesh;
}

type GraphEdge = {
  from: string;
  to: string;
  line: Three.Line;
}

type Graph = {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
}
 
const g : Graph = {
  nodes: {},
  edges: []
}


function animate() {
  requestAnimationFrame(animate);

  const forces: Record<string, Three.Vector3> = {};

  // Initialize forces
  Object.keys(g.nodes).forEach(id => {
    forces[id] = new Three.Vector3();
  });
  // Calculate repulsive forces between all nodes
  Object.values(g.nodes).forEach((nodeA) => {
    Object.values(g.nodes).forEach((nodeB) => {
      if (nodeA.id !== nodeB.id) {
        const force = repulsiveForce(nodeA.id, nodeB.id);
        forces[nodeA.id].add(force);
      }
    });
  });

  // Calculate attractive forces for edges
  g.edges.forEach(edge => {
    const force = attractiveForce(edge.from, edge.to);
    forces[edge.from].add(force);
    forces[edge.to].sub(force);
  });

  // Update velocities and positions
  Object.values(g.nodes).forEach(node => {
    node.acceleration.copy(forces[node.id]);
    node.velocity.add(node.acceleration);
    node.velocity.multiplyScalar(damping); // Damping
    node.mesh.position.add(node.velocity);
  });

  // Update edge positions
  g.edges.forEach(edge => {
    const fromPos = g.nodes[edge.from].mesh.position;
    const toPos = g.nodes[edge.to].mesh.position;
    const points = [fromPos, toPos];
    const edgeLine = edge.line;
    edgeLine.geometry.setFromPoints(points);
    edgeLine.geometry.attributes.position.needsUpdate = true;
  });

  renderer.render(scene, camera);
}


const repulsionStrength = 0.3;
const springLength = 0.2;
const springStrength = 0.3;
const damping = 0.2;

const attractiveForce = (from: string, to: string ) => {
  const posFrom = g.nodes[from].mesh.position;
  const posTo = g.nodes[to].mesh.position;
  const dir = new Three.Vector3().subVectors(posTo, posFrom);
  const distance = dir.length();
  
  // Prevent NaN values
  if (distance < 0.001) {
    return new Three.Vector3(0, 0, 0); // No force if nodes are too close
  }
  
  dir.normalize();
  const forceMagnitude = springStrength * (distance - springLength);
  return dir.multiplyScalar(forceMagnitude);
};

const repulsiveForce = (from: string, to: string) => {
  const posFrom = g.nodes[from].mesh.position;
  const posTo = g.nodes[to].mesh.position;
  const dir = new Three.Vector3().subVectors(posFrom, posTo);
  const distance = dir.length();
  
  // Prevent division by zero and NaN values
  if (distance < 0.001) {
    // Add small random offset if nodes are too close
    dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    dir.normalize();
    return dir.multiplyScalar(repulsionStrength * 1000); // Strong repulsion for very close nodes
  }
  
  dir.normalize();
  const forceMagnitude = repulsionStrength / (distance * distance);
  return dir.multiplyScalar(forceMagnitude);
}

const addNewNode = (id: string) => {
  const nodeGeometry = new Three.SphereGeometry(0.1, 16, 16);
  const nodeMaterial = new Three.MeshBasicMaterial({ color: 0x0000ff });
  const nodeMesh = new Three.Mesh(nodeGeometry, nodeMaterial);
  
  // Add random initial position to prevent all nodes from starting at (0,0,0)
  nodeMesh.position.set(
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2
  );
  
  scene.add(nodeMesh);

  g.nodes[id] =
    {
      id,
      label: `Node ${id}`,
      velocity: new Three.Vector3(),
      acceleration: new Three.Vector3(),
      mesh: nodeMesh
    }
}

const addEdge = (from: string, to: string) => {
  const fromNode = g.nodes[from];
  const toNode = g.nodes[to];
  if (!fromNode || !toNode) return;

  const points = [fromNode.mesh.position, toNode.mesh.position];
  const edgeGeometry = new Three.BufferGeometry().setFromPoints(points);
  const edgeMaterial = new Three.LineBasicMaterial({ color: 0x000000 });
  const edgeLine = new Three.Line(edgeGeometry, edgeMaterial);
  
  scene.add(edgeLine);

  g.edges.push({
    from,
    to,
    line: edgeLine
  });
}



type Puzzle = {
  id: string;
  size: number;
  blocks: {
    x: number;
    y: number;
    isHorizontal: boolean;
    length: number;
  }[];
}




const toId = (blocks : {
  x: number;
  y: number;
  isHorizontal: boolean;
  length: number;
}[], size: number) => {
  const id = Array.from({ length: size * size }, () => '.');
  blocks.forEach((block, index) => {
    for (let i = 0; i < block.length; i++) {
      const x = block.x + (block.isHorizontal ? i : 0);
      const y = block.y + (block.isHorizontal ? 0 : i);
      const pos = y * size + x;
      id[pos] = String.fromCharCode(65 + index);
    }
  });
  return id.join('');
}

const puzzle: Puzzle = {
  id: toId(blocksInit, size),
  size,
  blocks: blocksInit,
};

const moves = (puzzle: Puzzle) => {
  const array = puzzle.id.split('');
  const moves: Puzzle[] = [];
  puzzle.blocks.forEach((block, index) => {
    if(block.isHorizontal) {
      //Move left
      //Check if edge
      //Check if blocked
      const isEdge = block.x === 0;
      const isBlocked = !isEdge && array[block.y * puzzle.size + (block.x - 1)] !== '.';
      if(!isEdge && !isBlocked) {
        const newPuzzle = JSON.parse(JSON.stringify(puzzle)) as Puzzle;
        newPuzzle.blocks[index].x -= 1;
        newPuzzle.id = toId(newPuzzle.blocks, newPuzzle.size);
        moves.push(newPuzzle);
      }

      //Move right
      const isEdgeRight = block.x + block.length === puzzle.size;
      const isBlockedRight = !isEdgeRight && array[block.y * puzzle.size + (block.x + block.length)] !== '.';
      if(!isEdgeRight && !isBlockedRight) {
        const newPuzzle = JSON.parse(JSON.stringify(puzzle)) as Puzzle;
        newPuzzle.blocks[index].x += 1;
        newPuzzle.id = toId(newPuzzle.blocks, newPuzzle.size);
        moves.push(newPuzzle);
      }
    }

    if(!block.isHorizontal) {
      //Move up
      const isEdge = block.y === 0;
      const isBlocked = !isEdge && array[(block.y - 1) * puzzle.size + block.x] !== '.';
      if(!isEdge && !isBlocked) {
        const newPuzzle = JSON.parse(JSON.stringify(puzzle)) as Puzzle;
        newPuzzle.blocks[index].y -= 1;
        newPuzzle.id = toId(newPuzzle.blocks, newPuzzle.size);
        moves.push(newPuzzle);
      }

      //Move down
      const isEdgeDown = block.y + block.length === puzzle.size;
      const isBlockedDown = !isEdgeDown && array[(block.y + block.length) * puzzle.size + block.x] !== '.';
      if(!isEdgeDown && !isBlockedDown) {
        const newPuzzle = JSON.parse(JSON.stringify(puzzle)) as Puzzle;
        newPuzzle.blocks[index].y += 1;
        newPuzzle.id = toId(newPuzzle.blocks, newPuzzle.size);
        moves.push(newPuzzle);
      }
    }
  });
  return moves;
}

const dfs = (puzzle: Puzzle, visited = new Set<string>(), parent?: Puzzle) => {
  if (visited.has(puzzle.id)) {
    addEdge(parent!.id, puzzle.id);
    return;
  }
  console.log('Visiting:', puzzle.id);
  visited.add(puzzle.id);
  addNewNode(puzzle.id);
  if (parent) {
    addEdge(parent.id, puzzle.id);
  }
  const nextMoves = moves(puzzle);
  nextMoves.forEach((move) => {
    dfs(move, visited, puzzle);
  });
  return visited;
};

dfs(puzzle);


animate();