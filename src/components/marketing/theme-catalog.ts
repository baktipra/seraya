import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';

export type ThemePalette = {
  accent: string;
  canvas: string;
  ink: string;
  key: string;
  name: string;
  paper: string;
  soft: string;
  swatch: string;
};

export type ThemeCatalogItem = {
  badge: string;
  description: string;
  key: InvitationTemplateKey;
  motif: string;
  name: string;
  palettes: readonly ThemePalette[];
  personality: string;
};

export const featuredThemes: readonly ThemeCatalogItem[] = [
  {
    badge: 'Soft romance',
    description: 'Botanical, hangat, dan terasa seperti surat personal untuk setiap tamu.',
    key: 'roselle',
    motif: '/marketing/roselle-botanical-line.svg',
    name: 'Roselle',
    personality: 'Romantic editorial',
    palettes: [
      {
        accent: '#8e4b52',
        canvas: '#f2dedd',
        ink: '#3d2d31',
        key: 'rose',
        name: 'Rose',
        paper: '#fffaf7',
        soft: '#dcb9b6',
        swatch: '#b96872',
      },
      {
        accent: '#5f7562',
        canvas: '#e2eadf',
        ink: '#2f3d33',
        key: 'sage',
        name: 'Sage',
        paper: '#fbfcf7',
        soft: '#b7c9b5',
        swatch: '#7d9a7f',
      },
      {
        accent: '#a66b35',
        canvas: '#f5e8c9',
        ink: '#4a3725',
        key: 'butter',
        name: 'Butter',
        paper: '#fffdf5',
        soft: '#dfc786',
        swatch: '#d5ae54',
      },
      {
        accent: '#783c54',
        canvas: '#ead9e2',
        ink: '#3f2832',
        key: 'berry',
        name: 'Berry',
        paper: '#fff9fc',
        soft: '#c49aad',
        swatch: '#96546f',
      },
    ],
  },
  {
    badge: 'Gen Z editorial',
    description: 'Grid bersih, tipografi tegas, dan komposisi yang terasa seperti wedding zine.',
    key: 'aruna',
    motif: '/marketing/aruna-editorial-grid.svg',
    name: 'Aruna',
    personality: 'Modern wedding journal',
    palettes: [
      {
        accent: '#59625d',
        canvas: '#e7e5dc',
        ink: '#252a27',
        key: 'stone',
        name: 'Stone',
        paper: '#f8f7f2',
        soft: '#b9b9ae',
        swatch: '#757c77',
      },
      {
        accent: '#63764e',
        canvas: '#e6ead7',
        ink: '#303827',
        key: 'matcha',
        name: 'Matcha',
        paper: '#fafbf3',
        soft: '#b9c797',
        swatch: '#80945f',
      },
      {
        accent: '#315b9b',
        canvas: '#dce7f7',
        ink: '#20334e',
        key: 'cobalt',
        name: 'Cobalt',
        paper: '#f8fbff',
        soft: '#94afd7',
        swatch: '#4778bf',
      },
      {
        accent: '#a95f42',
        canvas: '#f3dfd2',
        ink: '#4a3026',
        key: 'apricot',
        name: 'Apricot',
        paper: '#fffaf6',
        soft: '#d7a086',
        swatch: '#c97b59',
      },
    ],
  },
  {
    badge: 'After-dark',
    description: 'Formal tetapi tetap muda, dengan suasana malam dan detail metalik yang tenang.',
    key: 'laras',
    motif: '/marketing/laras-evening-geometry.svg',
    name: 'Laras',
    personality: 'Modern evening formal',
    palettes: [
      {
        accent: '#d7b982',
        canvas: '#201f26',
        ink: '#f4ead8',
        key: 'midnight',
        name: 'Midnight',
        paper: '#2b2931',
        soft: '#655b4f',
        swatch: '#2c2a34',
      },
      {
        accent: '#e1b28e',
        canvas: '#3a2028',
        ink: '#fff1e7',
        key: 'burgundy',
        name: 'Burgundy',
        paper: '#4a2731',
        soft: '#8d5362',
        swatch: '#7b394c',
      },
      {
        accent: '#d4c58c',
        canvas: '#18362f',
        ink: '#f4f0db',
        key: 'emerald',
        name: 'Emerald',
        paper: '#21443b',
        soft: '#53776b',
        swatch: '#2e6455',
      },
      {
        accent: '#8a6443',
        canvas: '#eee6da',
        ink: '#3e3228',
        key: 'ivory',
        name: 'Ivory',
        paper: '#fffaf2',
        soft: '#cdbba6',
        swatch: '#d7c8b5',
      },
    ],
  },
];
