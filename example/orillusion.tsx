import React, { FC, useEffect, useRef } from 'react';
import {
  Object3D,
  Scene3D,
  Engine3D,
  AtmosphericComponent,
  CameraUtil,
  HoverCameraController,
  View3D,
  DirectLight,
  KelvinUtil,
  PlaneGeometry,
  MeshRenderer,
  Object3DUtil,
} from '@orillusion/core/src';
import { OrillusionSGMaterial } from '../src/materials/OrillusionSGMaterial';
import { ShaderGraphCompiler } from '../src/compilers';
import { initShaderGraphComponents } from '../src';
import { SubGraphProvider } from './graph';
import demoFlowMap from './demo/demoGradient.json';

class Sample_ShaderGraphMaterial {
  lightObj3D: Object3D;
  scene: Scene3D;

  async run(canvas: HTMLCanvasElement) {
    await Engine3D.init({ canvasConfig: { canvas } });

    this.scene = new Scene3D();
    this.scene.addComponent(AtmosphericComponent);

    let mainCamera = CameraUtil.createCamera3DObject(this.scene);

    mainCamera.perspective(60, Engine3D.aspect, 1, 2000.0);
    mainCamera.object3D.addComponent(HoverCameraController).setCamera(45, -45, 50);

    await this.initScene(this.scene);

    let view = new View3D();
    view.scene = this.scene;
    view.camera = mainCamera;

    Engine3D.startRenderView(view);
  }

  async initScene(scene: Scene3D) {
    {
      this.lightObj3D = new Object3D();
      this.lightObj3D.x = 0;
      this.lightObj3D.y = 30;
      this.lightObj3D.z = -40;
      this.lightObj3D.rotationX = 46;
      this.lightObj3D.rotationY = 62;
      this.lightObj3D.rotationZ = 0;
      let directLight = this.lightObj3D.addComponent(DirectLight);
      directLight.lightColor = KelvinUtil.color_temperature_to_rgb(5355);
      directLight.castShadow = true;
      directLight.intensity = 20;
      scene.addChild(this.lightObj3D);
    }

    // create a unlit plane
    await this.createObject(scene);

    // add a lit sphere
    {
      let sphere = Object3DUtil.Sphere;
      sphere.scaleX = 5;
      sphere.scaleY = 5;
      sphere.scaleZ = 5;
      sphere.y = 10;
      this.scene.addChild(sphere);
    }
    return true;
  }

  private async createObject(scene: Scene3D): Promise<Object3D> {
    const mat = new OrillusionSGMaterial();
    const obj: Object3D = new Object3D();
    const compiler = new ShaderGraphCompiler();
    compiler.setSubGraphProvider(SubGraphProvider);
    initShaderGraphComponents().forEach(com => compiler.register(com));
    const compliation = await compiler.compile(demoFlowMap as any);
    await mat.sg.init(compliation);

    let render = obj.addComponent(MeshRenderer);
    render.material = mat;
    render.geometry = new PlaneGeometry(200, 200);
    obj.y = 1;
    scene.addChild(obj);

    return obj;
  }

  dispose() {}
}

export const OrillusionPage: FC<{}> = () => {
  const canvasRef = useRef<HTMLCanvasElement>();

  useEffect(() => {
    const demo = new Sample_ShaderGraphMaterial();
    demo.run(canvasRef.current!);
    return () => demo.dispose();
  }, []);

  return <canvas ref={el => (canvasRef.current = el!)} style={{ width: '100%', height: '100%' }} />;
};
