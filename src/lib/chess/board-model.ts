import { Group, Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const BOARD_MODEL_URL = "/assets/chessboard.glb";

export const loadBoardModel = async (): Promise<Group> => {
  const gltf = await new GLTFLoader().loadAsync(BOARD_MODEL_URL);
  return gltf.scene;
};

export const disposeBoardModel = (model: Group): void => {
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => material.dispose());
  });
};
