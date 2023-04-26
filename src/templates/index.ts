import { LitMaterialTemplate, LitSGTemplate } from './Lit';
import { UnlitMaterialTemplate, UnlitSGTemplate } from './Unlit';

export const MaterialTemplates = Object.freeze({
  unlit: UnlitMaterialTemplate,
  lit: LitMaterialTemplate,
  subgraph: UnlitMaterialTemplate,
} as const);

export const SGTemplates = Object.freeze({
  lit: LitSGTemplate,
  unlit: UnlitSGTemplate,
  subgraph: UnlitSGTemplate,
});

export const SG_VERT = 'const SG_VERT = true;\n';
