import { Rete } from "../../types";

export interface PopupViewProps {
  editor: Rete.NodeEditor;
  view: PopupView<any>;
}

export class PopupView<Props extends PopupViewProps> {
  el: HTMLDivElement;
  props!: Props;
  showing = false;

  constructor(public editor: Rete.NodeEditor, public component: any, className?: string) {
    this.el = document.createElement('div');
    className && this.el.classList.add(className);
  }

  show(props?: Partial<Omit<Props, 'editor' | 'view'>>) {
    this.props = { ...this.props, ...props };
    this.editor.trigger('rendercustom', {
      render: 'react',
      component: this.component,
      view: this,
      callback: () => this._setPopupShow(true),
    });
    this.showing = true;
  }

  hide = () => {
    this._setPopupShow(false);
    this.showing = false;
  };

  setShowState(show: boolean) {
    show ? this.show() : this.hide();
  }

  toggle = () => (this.showing ? this.hide() : this.show());

  // replace in popup
  _setPopupShow(show: boolean) {}
  // replace in react render plugin
  update() {}
}
