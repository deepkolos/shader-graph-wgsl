import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Camera,
  CapsuleGeometry,
  Clock,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Matrix4,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Scene,
  SphereGeometry,
  Vector3,
} from 'three';
import { getClientSize, PreviewClient } from './PreviewClient';
import { ShaderGraphEditor } from '../../editors';
import { Rete } from '../../types';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GPUGeometry, WebGPUMaterial, WebGPURenderer, disposeGeometry } from '../../materials';

const I_Model = new Matrix4();
const IT_ModelView = new Matrix4();
const IT_Model = new Matrix4();
const cameraWS = new Vector3();

const scaleFactor = 1 / 15;

export class PreviewServer {
  clock: Clock;
  canvas: HTMLCanvasElement;
  scene: Scene;
  clients = new Map<HTMLCanvasElement, PreviewClient>();
  nodeClients = new Set<PreviewClient>();
  mainClients = new Set<PreviewClient>();
  geometries = {
    Sphere: new SphereGeometry(15 * scaleFactor),
    Capsule: new CapsuleGeometry(10 * scaleFactor, 10 * scaleFactor, 25, 25),
    Cylinder: new CylinderGeometry(15 * scaleFactor, 15 * scaleFactor, 15 * scaleFactor),
    Cube: new BoxGeometry(20 * scaleFactor, 20 * scaleFactor, 20 * scaleFactor),
    Quad: new PlaneGeometry(25 * scaleFactor, 25 * scaleFactor),
    Sprite: new PlaneGeometry(25 * scaleFactor, 25 * scaleFactor),
  } as const;
  mesh: Mesh<BufferGeometry, RawShaderMaterial>;
  camera2D = new OrthographicCamera();
  camera3D = new PerspectiveCamera(45, 1, 1, 1000);
  control!: OrbitControls;

  geometry3D: BufferGeometry;
  geometry2D: PlaneGeometry;
  renderer: WebGPURenderer;
  mainMaterial: WebGPUMaterial;
  disposed = false;

  constructor(public editor: ShaderGraphEditor) {
    this.canvas = document.createElement('canvas');
    this.scene = new Scene();
    this.clock = new Clock();
    Object.values(this.geometries).forEach(geo => geo.center());

    this.renderer = new WebGPURenderer();
    this.mainMaterial = new WebGPUMaterial();
    this.geometry3D = this.geometries.Sphere;
    this.geometry2D = new PlaneGeometry(2, 2);

    this.mesh = new Mesh();
    this.scene.add(this.mesh);
    this.scene.background = new Color('#2b2b2b');

    const ambientLight = new AmbientLight('#ffffff', 0);
    const dirLight = new DirectionalLight('#ffffff', 1);
    dirLight.position.set(-50, 50, 50);
    this.camera2D.position.z = 3.1;
    this.camera3D.position.z = -3.1;
    this.camera3D.add(ambientLight, dirLight);
    this.scene.add(this.camera2D, this.camera3D);

    this.renderer.init().then(this.render);
  }

  updateGeometry3D(geometryName: string) {
    const geometry = this.geometries[geometryName as keyof typeof this.geometries];
    if (geometry) {
      this.geometry3D = geometry;
    } else if (geometryName === 'Custom Mesh') {
      this.editor.trigger('previewcustommesh', geometry => {
        if (!geometry) throw new Error('load custom mesh failed');
        this.geometry3D = geometry;
      });
    } else throw new Error('TODO');
  }

  render = async () => {
    await this.checkNodeChange();
    if (this.disposed) return;
    const deltaTime = this.clock.getDelta();
    this.mainMaterial.sg.update(deltaTime);
    this.clients.forEach(this.renderClient);
    requestAnimationFrame(this.render);
    // setTimeout(this.render, 500);
  };

  updateMaterialUnifroms(camera: Camera) {
    const { mesh, mainMaterial } = this;
    camera.updateMatrixWorld(); // 需要使用最新的算 否则出现抖动
    mesh.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
    IT_ModelView.copy(mesh.modelViewMatrix).invert().transpose();
    I_Model.copy(mesh.matrixWorld).invert();
    IT_Model.copy(I_Model).transpose();
    mainMaterial.sg.set('Matrix', 'IT_Model', IT_Model);
    mainMaterial.sg.set('Matrix', 'IT_ModelView', IT_ModelView);
    mainMaterial.sg.set('Matrix', 'I_Model', I_Model);
    mainMaterial.sg.set('Matrix', 'Model', mesh.matrixWorld);
    mainMaterial.sg.set('Matrix', 'ModelView', mesh.modelViewMatrix);
    mainMaterial.sg.set('Matrix', 'Proj', camera.projectionMatrix);

    mainMaterial.sg.set(
      'ViewVector',
      'cameraWS',
      cameraWS.setFromMatrixPosition(camera.matrixWorld),
    );
  }

  async checkNodeChange() {
    if (this.editor.silent) return;
    let needUpdateMaterial = false;
    this.editor.nodes.forEach(node => {
      needUpdateMaterial = needUpdateMaterial || node.changed;
      node.resetChanged();
    });

    if (needUpdateMaterial) await this.updateAllMaterial();
  }

  async updateAllMaterial() {
    const clients = [...this.nodeClients];
    // console.log('updateAllMaterial', clients);
    if (this.editor.editing === 'ShaderGraph') {
      const graphData = await this.editor.compiler.compile(this.editor.toJSON());
      await this.mainMaterial.sg.init(graphData);
      this.mesh.material = this.mainMaterial;
    }

    if (this.editor.editing === 'SubGraph') {
      const graphData = await this.editor.compiler.compileSubGraphPreview(this.editor.toJSON());
      await this.mainMaterial.sg.init(graphData);
      this.mesh.material = this.mainMaterial;
    }

    await Promise.all(
      clients.map(async client => {
        try {
          const compilation = await this.editor.compiler.compilePreview(client.node!);
          client.updateMaterial(compilation, this.mainMaterial);
        } catch (error) {
          debugger;
          console.warn(error);
        }
      }),
    );
  }

  renderClient = (client: PreviewClient) => {
    if (client.enable) {
      this.mesh.material = client.node ? client.material : this.mainMaterial;
      this.mesh.geometry = client.type === '2d' ? this.geometry2D : this.geometry3D;
      const camera = client.type === '2d' ? this.camera2D : this.camera3D;
      client.updateCamera(this.camera3D);
      this.updateMaterialUnifroms(camera);
      this.syncCanvasSize(client.canvas);
      this.renderer.render(this.scene, camera, client.ctx);
    }
  };

  syncCanvasSize(canvas: HTMLCanvasElement) {
    const { width, height } = getClientSize(canvas);
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
  }

  add(client: PreviewClient) {
    // console.log('add', client.node?.name);
    if (this.clients.has(client.canvas)) this.remove(client.canvas);
    this.clients.set(client.canvas, client);
    (client.node ? this.nodeClients : this.mainClients).add(client);
    if (!client.node) this.control = this.control || new OrbitControls(this.camera3D, client.canvas);
  }

  remove(canvas: HTMLCanvasElement) {
    const old = this.clients.get(canvas);
    if (old) {
      (old.node ? this.nodeClients : this.mainClients).delete(old);
      old.dispose();
    }
    this.clients.delete(canvas);
    // console.log('remove', old?.node?.name);
  }

  removeNode(node: Rete.Node) {
    const client = [...this.nodeClients].find(i => i.node === node);
    if (client) this.remove(client.canvas);
  }

  async dispose() {
    this.disposed = true;
    await this.renderer.dispose();
    Object.values(this.geometries).forEach(disposeGeometry);
    disposeGeometry(this.mesh.geometry);
    this.control?.dispose();
    this.clients.forEach(i => i.dispose());
    this.clients.clear();
    this.nodeClients.clear();
    this.mainClients.clear();
  }
}
