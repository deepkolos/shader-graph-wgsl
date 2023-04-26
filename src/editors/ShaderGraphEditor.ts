import { createRoot } from 'react-dom/client';
import { BlackBoardView, InspectorView, MainPreviewView } from '../view';
import {
  AlphaBlock,
  AlphaClipBlock,
  CoatMaskBlock,
  CoatSmoothnessBlock,
  FragmentRC,
  initShaderGraphComponents,
  ParameterRC,
} from '../components';
import {
  EditorContextMenuPlugin,
  FixedLinkPlugin,
  FixedNodePlugin,
  FragVertExclusivePlugin,
  LoopCheckPlugin,
  ReactRenderPlugin,
  ConnectionPlugin,
  PreviewPlugin,
  CheckVaryingLinkPlugin,
  AssetBasePlugin,
  CheckDDXYLinkPlugin,
  DynamicVectorPlugin,
  DynamicVecMatPlugin,
} from '../plugins';
import { Rete } from '../types';
import pkg from '../../package.json';
import {
  DEFAULT_SETTING,
  SGSetting,
  SGSettingValueCfgs,
  ShaderGraphData,
} from './ShaderGraphTypes';
import { ShaderGraphCompiler } from '../compilers';
import { RCBlock } from '../components/ReteComponent';
import { SubGraphProvider } from './SubGraphProvider';

declare module '../rete/core/events' {
  interface EventsTypes {
    imported: void;
    settingupdated: { name: string; value: any; setting: SGSetting };
  }
}

export class ShaderGraphEditor extends Rete.NodeEditor {
  blackboardView!: BlackBoardView;
  mainPreviewView!: MainPreviewView;
  compiler: ShaderGraphCompiler;
  inspectorView!: InspectorView;
  clearing = false;
  editing!: 'ShaderGraph' | 'SubGraph';
  subGraphProvider?: SubGraphProvider;

  disposables: Array<() => void> = [];

  constructor(id: string, container: HTMLElement) {
    super(id, container);

    this.compiler = new ShaderGraphCompiler();

    this.initEvents();
    this.use(ReactRenderPlugin, { createRoot });
    this.use(FragVertExclusivePlugin);
    this.use(EditorContextMenuPlugin);
    this.use(ConnectionPlugin);
    this.use(LoopCheckPlugin);
    this.use(FixedLinkPlugin);
    this.use(FixedNodePlugin);
    this.use(CheckVaryingLinkPlugin);
    this.use(AssetBasePlugin);
    this.use(CheckDDXYLinkPlugin);
    this.use(DynamicVectorPlugin);
    this.use(DynamicVecMatPlugin);

    const ShaderGraphComponents = initShaderGraphComponents();
    ShaderGraphComponents.forEach(c => {
      this.register(c);
      this.compiler.register(c);
    });

    this.use(PreviewPlugin);

    this.blackboardView = new BlackBoardView(this, [], ParameterRC.Name, 'ShaderGraph');
    this.mainPreviewView = new MainPreviewView(this);
    this.inspectorView = new InspectorView(this, SGSettingValueCfgs);
  }

  private initEvents() {
    this.bind('imported');
    this.bind('settingupdated');
    const dispose = this.on('settingupdated', ({ name, value, setting }) => {
      if (name === 'alphaClipping') {
        const fragContext = this.nodes.find(i => i.name === FragmentRC.Name);
        if (!fragContext) throw new Error('Graph missing Fragment Context');

        if (value) {
          [AlphaClipBlock.Name, AlphaBlock.Name].forEach(async nodeName => {
            const com = this.getComponent(nodeName) as RCBlock;
            const node = await com.createNode();
            this.addBlock(fragContext, node, com);
          });
        } else {
          const node = fragContext.blocks.find(i => i.name === AlphaClipBlock.Name);
          node && this.removeNode(node);
        }
      }

      if (name === 'clearCoat') {
        const fragContext = this.nodes.find(i => i.name === FragmentRC.Name);
        if (!fragContext) throw new Error('Graph missing Fragment Context');

        const blocks = [CoatMaskBlock.Name, CoatSmoothnessBlock.Name];
        if (value)
          blocks.forEach(async nodeName => {
            const com = this.getComponent(nodeName) as RCBlock;
            const node = await com.createNode();
            this.addBlock(fragContext, node, com);
          });
        else
          blocks.forEach(nodeName => {
            const node = fragContext.blocks.find(i => i.name === nodeName);
            node && this.removeNode(node);
          });
      }
    });
    this.disposables.push(dispose);
  }

  setSubGraphProvider(provider: SubGraphProvider) {
    this.subGraphProvider = provider;
    this.compiler.setSubGraphProvider(provider);
  }

  async initShaderGraphNodes() {
    this.editing = 'ShaderGraph';
    this.mainPreviewView.show();
    this.blackboardView.show();
    this.inspectorView.show();
    this.inspectorView.fromJSON(DEFAULT_SETTING());

    const [frag, vert, pos, normal, color] = await Promise.all([
      this.createNode('Fragment'),
      this.createNode('Vertex'),
      this.createNode('PositionBlock'),
      this.createNode('NormalBlock'),
      this.createNode('BaseColorBlock'),
    ]);

    this.silent = true;
    frag.position = [550, 0];
    vert.position = [550, -300];
    vert.addBlock(pos).addBlock(normal);
    frag.addBlock(color);

    this.addNode(frag);
    this.addNode(vert);
    this.connect(vert.outputs.get('vert')!, frag.inputs.get('vert')!, { fixed: true });
    this.silent = false;
  }

  async initSubGraphNodes() {
    this.editing = 'SubGraph';
    this.mainPreviewView.show();
    this.blackboardView.show();
    this.inspectorView.show();
    this.inspectorView.fromJSON(DEFAULT_SETTING('subgraph'));

    const output = await this.createNode('Output');

    this.silent = true;
    output.position = [550, 0];
    this.addNode(output);
    this.silent = false;
  }

  addBlock(contextNode: Rete.Node, node: Rete.Node, com?: RCBlock): void {
    if (com?.onAddToContextNode) com.onAddToContextNode(contextNode, node);
    else super.addBlock(contextNode, node);
  }

  clear(silent = false): void {
    const old = this.silent;
    if (silent) this.silent = silent;
    this.clearing = true;
    super.clear();
    this.blackboardView.fromJSON([]);
    this.clearing = false;
    if (silent) this.silent = old;
  }

  async fromJSON(json: ShaderGraphData): Promise<boolean> {
    // TODO version check
    if (json.type !== 'ShaderGraph' && json.type !== 'SubGraph')
      throw new Error('data is not for shader graph or sub graph');

    const res = super.fromJSON(json);

    if (json.parameters) this.blackboardView.fromJSON(json.parameters);
    const setting = json.setting || DEFAULT_SETTING();
    if (json.type === 'SubGraph') setting.template = 'subgraph';
    this.inspectorView.fromJSON(setting);

    const { UIState } = json;
    this.blackboardView.setShowState(UIState?.showBlackBoard ?? true);
    this.mainPreviewView.setShowState(UIState?.showMainPreview ?? true);
    this.inspectorView.setShowState(UIState?.showInspector ?? true);
    this.editing = json.type;
    return res;
  }

  toJSON(): ShaderGraphData {
    const json = super.toJSON() as ShaderGraphData;
    json.UIState = {
      showMainPreview: this.mainPreviewView.showing,
      showBlackBoard: this.blackboardView.showing,
      showInspector: this.inspectorView.showing,
    };
    json.type = this.editing;
    json.version = pkg.version;
    json.setting = this.inspectorView.toJSON() as SGSetting;
    json.parameters = this.blackboardView.toJSON();
    return json;
  }

  afterImport() {
    const out = super.afterImport();
    this.trigger('imported');
    return out;
  }

  dispose() {
    this.disposables.forEach(i => i());
  }
}
