from __future__ import annotations

from pathlib import Path
import re
import textwrap

ROOT = Path.cwd()


def normalized(content: str) -> str:
    return textwrap.dedent(content).lstrip("\n").rstrip() + "\n"


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(normalized(content), encoding="utf-8")


def replace_text(path: str, old: str, new: str) -> None:
    target = ROOT / path
    source = target.read_text(encoding="utf-8")
    if old not in source:
        raise RuntimeError(f"Expected text not found in {path}: {old[:100]!r}")
    target.write_text(source.replace(old, new, 1), encoding="utf-8")


def replace_pattern(path: str, pattern: str, replacement: str, *, flags: int = 0) -> None:
    target = ROOT / path
    source = target.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, source, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected one regex match in {path}, got {count}: {pattern[:120]!r}")
    target.write_text(updated, encoding="utf-8")


write(
    "src/modules/invitation-templates/core/theme-renderer.types.ts",
    r'''
    import type { ComponentType, ReactNode } from 'react';

    import type { InvitationViewModel } from '../invitation-view-model';

    /** A rendering surface controls presentation composition only. */
    export type InvitationRenderSurfaceV1 = 'generic' | 'personal' | 'preview';

    /**
     * Opaque personal presentation nodes. Theme renderers may place these nodes,
     * but never receive or inspect the guest capability data used to create them.
     */
    export type PersonalInvitationPresentationSlotsV1 = Readonly<{
      greeting?: ReactNode;
      guestbook?: ReactNode;
      rsvp?: ReactNode;
    }>;

    export type InvitationTemplateRenderContextV1 = Readonly<{
      personalSlots?: PersonalInvitationPresentationSlotsV1;
      surface: InvitationRenderSurfaceV1;
    }>;

    /** Generic and preview surfaces deliberately discard personal presentation slots. */
    export function getPersonalInvitationPresentationSlots(
      renderContext: InvitationTemplateRenderContextV1,
    ): PersonalInvitationPresentationSlotsV1 | undefined {
      return renderContext.surface === 'personal' ? renderContext.personalSlots : undefined;
    }

    export type InvitationTemplateProps = {
      invitation: InvitationViewModel;
      renderContext: InvitationTemplateRenderContextV1;
    };

    export type InvitationTemplateComponent = ComponentType<InvitationTemplateProps>;
    ''',
)

write(
    "src/modules/invitation-templates/core/theme-package.types.ts",
    r'''
    import type { InvitationTemplateComponent } from './theme-renderer.types';

    export type ThemePaletteDescriptor = Readonly<{
      accent: string;
      canvas: string;
      ink: string;
      key: string;
      name: string;
      paper: string;
      soft: string;
      swatch: string;
    }>;

    export type ThemeCapabilityContract = Readonly<{
      digitalGift: boolean;
      gallery: boolean;
      guestbook: boolean;
      multiEvent: boolean;
      personalGreeting: boolean;
      rsvp: boolean;
    }>;

    export const FULL_INVITATION_THEME_CAPABILITIES = Object.freeze({
      digitalGift: true,
      gallery: true,
      guestbook: true,
      multiEvent: true,
      personalGreeting: true,
      rsvp: true,
    }) satisfies ThemeCapabilityContract;

    export type ThemeParityDescriptor = Readonly<{
      coupleAnchorId: string;
      experienceHook: string;
      experienceValue: string;
      greetingAnchorId: string;
      identity: string;
      invitationTitleId: string;
    }>;

    export type ThemeMarketingPreviewDescriptor = Readonly<{
      date: string;
      eyebrow: string;
      guestLine: string;
      guestName: string;
      showMonogram?: boolean;
      stageLabel: string;
    }>;

    export type InvitationThemeManifest<TKey extends string = string> = Readonly<{
      badge: string;
      capabilities: ThemeCapabilityContract;
      description: string;
      featured: boolean;
      key: TKey;
      mood: string;
      moods: readonly string[];
      motif: string;
      name: string;
      parity: ThemeParityDescriptor;
      personality: string;
      preview: ThemeMarketingPreviewDescriptor;
      styles: readonly string[];
    }>;

    export type InvitationThemePackage<TKey extends string = string> = Readonly<{
      defaultPaletteKey: string;
      manifest: InvitationThemeManifest<TKey>;
      palettes: readonly ThemePaletteDescriptor[];
      Renderer: InvitationTemplateComponent;
    }>;

    export function defineInvitationThemePackage<const TKey extends string>(
      definition: InvitationThemePackage<TKey>,
    ): InvitationThemePackage<TKey> {
      if (definition.palettes.length === 0) {
        throw new Error('Invitation theme package must define at least one palette.');
      }

      const paletteKeys = definition.palettes.map((palette) => palette.key);
      if (new Set(paletteKeys).size !== paletteKeys.length) {
        throw new Error('Invitation theme package palette keys must be unique.');
      }

      if (!paletteKeys.includes(definition.defaultPaletteKey)) {
        throw new Error('Invitation theme package default palette must exist in its palette list.');
      }

      return Object.freeze({
        ...definition,
        manifest: Object.freeze(definition.manifest),
        palettes: Object.freeze([...definition.palettes]),
      });
    }
    ''',
)

write(
    "src/modules/invitation-templates/roselle/roselle.package.ts",
    r'''
    import {
      defineInvitationThemePackage,
      FULL_INVITATION_THEME_CAPABILITIES,
    } from '../core/theme-package.types';

    import { RoselleTemplate } from './roselle-template';

    export const roselleThemePackage = defineInvitationThemePackage({
      defaultPaletteKey: 'rose',
      manifest: {
        badge: 'Soft romance',
        capabilities: FULL_INVITATION_THEME_CAPABILITIES,
        description: 'Botanical, hangat, dan terasa seperti surat personal untuk setiap tamu.',
        featured: true,
        key: 'roselle',
        mood: 'Botanical softness · warm editorial · intimate rhythm',
        moods: ['soft', 'warm', 'romantic'],
        motif: '/marketing/roselle-botanical-line.svg',
        name: 'Roselle',
        parity: {
          coupleAnchorId: 'roselle-couple-title',
          experienceHook: 'data-roselle-experience',
          experienceValue: 'letter-v1',
          greetingAnchorId: 'roselle-personal-greeting',
          identity: 'intimate-romantic-letter',
          invitationTitleId: 'roselle-invitation-title',
        },
        personality: 'Romantic editorial',
        preview: {
          date: '17 Agustus 2027',
          eyebrow: 'The wedding of',
          guestLine: 'Undangan personal telah disiapkan untuk',
          guestName: 'Bapak Aditya & Keluarga',
          stageLabel: 'Romantic warmth',
        },
        styles: ['romantic', 'editorial', 'botanical'],
      },
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
      Renderer: RoselleTemplate,
    });
    ''',
)

write(
    "src/modules/invitation-templates/aruna/aruna.package.ts",
    r'''
    import {
      defineInvitationThemePackage,
      FULL_INVITATION_THEME_CAPABILITIES,
    } from '../core/theme-package.types';

    import { ArunaTemplate } from './aruna-template';

    export const arunaThemePackage = defineInvitationThemePackage({
      defaultPaletteKey: 'stone',
      manifest: {
        badge: 'Gen Z editorial',
        capabilities: FULL_INVITATION_THEME_CAPABILITIES,
        description: 'Grid bersih, tipografi tegas, dan komposisi yang terasa seperti wedding zine.',
        featured: true,
        key: 'aruna',
        mood: 'Editorial grid · directional type · refined contrast',
        moods: ['modern', 'cool', 'expressive'],
        motif: '/marketing/aruna-editorial-grid.svg',
        name: 'Aruna',
        parity: {
          coupleAnchorId: 'aruna-couple-title',
          experienceHook: 'data-aruna-experience',
          experienceValue: 'journal-v1',
          greetingAnchorId: 'aruna-personal-greeting',
          identity: 'modern-wedding-journal',
          invitationTitleId: 'aruna-invitation-title',
        },
        personality: 'Modern wedding journal',
        preview: {
          date: 'Jakarta · 17.08.27',
          eyebrow: 'Wedding journal · 017',
          guestLine: 'Personal edition prepared for',
          guestName: 'Aditya & Family',
          stageLabel: 'Modern editorial',
        },
        styles: ['editorial', 'modern', 'minimal'],
      },
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
      Renderer: ArunaTemplate,
    });
    ''',
)

write(
    "src/modules/invitation-templates/laras/laras.package.ts",
    r'''
    import {
      defineInvitationThemePackage,
      FULL_INVITATION_THEME_CAPABILITIES,
    } from '../core/theme-package.types';

    import { LarasTemplate } from './laras-template';

    export const larasThemePackage = defineInvitationThemePackage({
      defaultPaletteKey: 'midnight',
      manifest: {
        badge: 'After-dark',
        capabilities: FULL_INVITATION_THEME_CAPABILITIES,
        description: 'Formal tetapi tetap muda, dengan suasana malam dan detail metalik yang tenang.',
        featured: true,
        key: 'laras',
        mood: 'Evening ceremony · antique gold · restrained heritage geometry',
        moods: ['formal', 'dramatic', 'elegant'],
        motif: '/marketing/laras-evening-geometry.svg',
        name: 'Laras',
        parity: {
          coupleAnchorId: 'laras-couple-title',
          experienceHook: 'data-laras-experience',
          experienceValue: 'evening-folio-v1',
          greetingAnchorId: 'laras-personal-greeting',
          identity: 'formal-evening-ceremony-folio',
          invitationTitleId: 'laras-invitation-title',
        },
        personality: 'Modern evening formal',
        preview: {
          date: 'Sabtu · 17 Agustus 2027',
          eyebrow: 'A formal evening',
          guestLine: 'Dengan hormat mengundang',
          guestName: 'Bapak Aditya sekeluarga',
          showMonogram: true,
          stageLabel: 'Formal evening',
        },
        styles: ['formal', 'evening', 'editorial'],
      },
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
      Renderer: LarasTemplate,
    });
    ''',
)

write(
    "src/modules/invitation-templates/core/theme-package.registry.ts",
    r'''
    import { arunaThemePackage } from '../aruna/aruna.package';
    import { larasThemePackage } from '../laras/laras.package';
    import { roselleThemePackage } from '../roselle/roselle.package';

    export const invitationThemePackageRegistry = Object.freeze({
      roselle: roselleThemePackage,
      aruna: arunaThemePackage,
      laras: larasThemePackage,
    });

    export type InvitationTemplateKey = keyof typeof invitationThemePackageRegistry;

    export const INVITATION_TEMPLATE_KEYS = Object.freeze(
      Object.keys(invitationThemePackageRegistry) as InvitationTemplateKey[],
    );

    export const DEFAULT_INVITATION_TEMPLATE_KEY: InvitationTemplateKey = 'roselle';

    export function isInvitationTemplateKey(value: unknown): value is InvitationTemplateKey {
      return (
        typeof value === 'string' &&
        Object.prototype.hasOwnProperty.call(invitationThemePackageRegistry, value)
      );
    }

    export function resolveInvitationTemplateKey(value: unknown): InvitationTemplateKey {
      return isInvitationTemplateKey(value) ? value : DEFAULT_INVITATION_TEMPLATE_KEY;
    }

    export function getInvitationThemePackage(templateKey: InvitationTemplateKey) {
      return invitationThemePackageRegistry[templateKey];
    }

    export const invitationThemePackages = Object.freeze(
      INVITATION_TEMPLATE_KEYS.map((templateKey) => getInvitationThemePackage(templateKey)),
    );

    export const featuredInvitationThemePackages = Object.freeze(
      invitationThemePackages.filter((themePackage) => themePackage.manifest.featured),
    );

    export function getDefaultInvitationThemePalette(templateKey: InvitationTemplateKey) {
      const themePackage = getInvitationThemePackage(templateKey);
      const palette = themePackage.palettes.find(
        (candidate) => candidate.key === themePackage.defaultPaletteKey,
      );

      if (!palette) {
        throw new Error('Invitation theme package default palette is unavailable.');
      }

      return palette;
    }
    ''',
)

write(
    "src/modules/invitation-templates/invitation-template.keys.ts",
    r'''
    export {
      DEFAULT_INVITATION_TEMPLATE_KEY,
      INVITATION_TEMPLATE_KEYS,
      isInvitationTemplateKey,
      resolveInvitationTemplateKey,
    } from './core/theme-package.registry';
    export type { InvitationTemplateKey } from './core/theme-package.registry';
    ''',
)

write(
    "src/modules/invitation-templates/invitation-template.types.ts",
    r'''
    import { DEFAULT_INVITATION_TEMPLATE_KEY } from './core/theme-package.registry';
    import type { InvitationTemplateKey } from './core/theme-package.registry';
    import type { InvitationTemplateComponent } from './core/theme-renderer.types';

    export {
      getPersonalInvitationPresentationSlots,
      type InvitationRenderSurfaceV1,
      type InvitationTemplateComponent,
      type InvitationTemplateProps,
      type InvitationTemplateRenderContextV1,
      type PersonalInvitationPresentationSlotsV1,
    } from './core/theme-renderer.types';

    /** Backward-compatible alias retained for existing preview imports. */
    export const DEFAULT_PREVIEW_TEMPLATE_ID = DEFAULT_INVITATION_TEMPLATE_KEY;

    export type InvitationTemplateId = InvitationTemplateKey;

    export type InvitationTemplateRegistry = Readonly<
      Record<InvitationTemplateId, InvitationTemplateComponent>
    >;
    ''',
)

write(
    "src/modules/invitation-templates/invitation-template-parity.ts",
    r'''
    import {
      getInvitationThemePackage,
      INVITATION_TEMPLATE_KEYS,
      type InvitationTemplateKey,
    } from './core/theme-package.registry';
    import type { ThemeParityDescriptor } from './core/theme-package.types';

    export type InvitationTemplateParityDescriptorV1 = ThemeParityDescriptor;

    export const invitationTemplateParityV1 = Object.freeze(
      Object.fromEntries(
        INVITATION_TEMPLATE_KEYS.map((templateKey) => [
          templateKey,
          getInvitationThemePackage(templateKey).manifest.parity,
        ]),
      ) as Readonly<Record<InvitationTemplateKey, InvitationTemplateParityDescriptorV1>>,
    );

    export const invitationTemplateParityIds = INVITATION_TEMPLATE_KEYS;

    export function getInvitationTemplateParityDescriptor(
      templateId: InvitationTemplateKey,
    ): InvitationTemplateParityDescriptorV1 {
      return invitationTemplateParityV1[templateId];
    }
    ''',
)

write(
    "src/modules/invitation-templates/invitation-template.registry.ts",
    r'''
    import {
      DEFAULT_INVITATION_TEMPLATE_KEY,
      getInvitationThemePackage,
      INVITATION_TEMPLATE_KEYS,
      type InvitationTemplateKey,
    } from './core/theme-package.registry';
    import { createInvitationTemplateParityBoundary } from './invitation-template-parity-boundary';
    import type {
      InvitationTemplateComponent,
      InvitationTemplateRegistry,
    } from './invitation-template.types';

    export const invitationTemplateRegistry = Object.freeze(
      Object.fromEntries(
        INVITATION_TEMPLATE_KEYS.map((templateKey) => [
          templateKey,
          createInvitationTemplateParityBoundary(
            templateKey,
            getInvitationThemePackage(templateKey).Renderer,
          ),
        ]),
      ) as InvitationTemplateRegistry,
    );

    /** Compatibility exports retained while consumers migrate to package selectors. */
    export const ArunaParityTemplate = invitationTemplateRegistry.aruna;
    export const LarasParityTemplate = invitationTemplateRegistry.laras;
    export const RoselleParityTemplate = invitationTemplateRegistry.roselle;

    export function getInvitationTemplate(
      templateId: InvitationTemplateKey = DEFAULT_INVITATION_TEMPLATE_KEY,
    ): InvitationTemplateComponent {
      return invitationTemplateRegistry[templateId];
    }
    ''',
)

write(
    "src/modules/invitation-templates/invitation-template-renderer.tsx",
    r'''
    import type { InvitationTemplateKey } from './core/theme-package.registry';
    import type {
      InvitationTemplateRenderContextV1,
      PersonalInvitationPresentationSlotsV1,
    } from './core/theme-renderer.types';
    import { getInvitationTemplate } from './invitation-template.registry';
    import type { InvitationViewModel } from './invitation-view-model';

    type InvitationTemplateRendererProps = {
      invitation: InvitationViewModel;
      personalSlots?: PersonalInvitationPresentationSlotsV1;
      surface: InvitationTemplateRenderContextV1['surface'];
      templateKey: InvitationTemplateKey;
    };

    function createRenderContext({
      personalSlots,
      surface,
    }: Pick<InvitationTemplateRendererProps, 'personalSlots' | 'surface'>): InvitationTemplateRenderContextV1 {
      if (surface !== 'personal') {
        return { surface };
      }

      return { personalSlots, surface };
    }

    /** Canonical renderer used by preview, generic, and personal invitation surfaces. */
    export function InvitationTemplateRenderer({
      invitation,
      personalSlots,
      surface,
      templateKey,
    }: InvitationTemplateRendererProps) {
      const renderContext = createRenderContext({ personalSlots, surface });
      const Template = getInvitationTemplate(templateKey);

      return <Template invitation={invitation} renderContext={renderContext} />;
    }
    ''',
)

for template_name in ("roselle", "aruna", "laras"):
    replace_text(
        f"src/modules/invitation-templates/{template_name}/{template_name}-template.tsx",
        "from '../invitation-template.types';",
        "from '../core/theme-renderer.types';",
    )

write(
    "src/components/marketing/theme-catalog.ts",
    r'''
    import {
      featuredInvitationThemePackages,
      type InvitationTemplateKey,
    } from '@/modules/invitation-templates/core/theme-package.registry';
    import type { ThemePaletteDescriptor } from '@/modules/invitation-templates/core/theme-package.types';

    export type ThemePalette = ThemePaletteDescriptor;

    export type ThemeCatalogItem = {
      badge: string;
      description: string;
      key: InvitationTemplateKey;
      motif: string;
      name: string;
      palettes: readonly ThemePalette[];
      personality: string;
    };

    export const featuredThemes: readonly ThemeCatalogItem[] = Object.freeze(
      featuredInvitationThemePackages.map((themePackage) => ({
        badge: themePackage.manifest.badge,
        description: themePackage.manifest.description,
        key: themePackage.manifest.key,
        motif: themePackage.manifest.motif,
        name: themePackage.manifest.name,
        palettes: themePackage.palettes,
        personality: themePackage.manifest.personality,
      })),
    );
    ''',
)

write(
    "src/components/marketing/homepage-theme-grid.module.css",
    r'''
    .grid {
      position: relative;
    }
    ''',
)

flagship_path = "src/components/marketing/flagship-marketing.tsx"
replace_text(
    flagship_path,
    "import { siteConfig } from '@/config/site';\n",
    "import { siteConfig } from '@/config/site';\nimport {\n  getInvitationThemePackage,\n  invitationThemePackages,\n  type InvitationTemplateKey,\n} from '@/modules/invitation-templates/core/theme-package.registry';\n",
)
replace_pattern(
    flagship_path,
    r"export type FlagshipCollectionKey = 'roselle' \| 'aruna' \| 'laras';\n\nexport const flagshipCollections = \[.*?\] as const;",
    normalized(
        r'''
        export type FlagshipCollectionKey = InvitationTemplateKey;

        export const flagshipCollections = Object.freeze(
          invitationThemePackages.map((themePackage, index) => ({
            description: themePackage.manifest.description,
            key: themePackage.manifest.key,
            mood: themePackage.manifest.mood,
            name: themePackage.manifest.name,
            ordinal: String(index + 1).padStart(2, '0'),
            personality: themePackage.manifest.personality,
          })),
        );
        '''
    ).rstrip(),
    flags=re.S,
)
replace_pattern(
    flagship_path,
    r"\nconst previewCopy: Record<.*?\n};\n\nconst previewClassByCollection: Record<FlagshipCollectionKey, string> = \{.*?\n};\n\nconst collectionOrdinal: Record<FlagshipCollectionKey, string> = \{.*?\n};\n",
    "\nconst previewStyles = styles as Readonly<Record<string, string>>;\n",
    flags=re.S,
)
replace_text(
    flagship_path,
    "  const copy = previewCopy[collection];",
    "  const copy = getInvitationThemePackage(collection).manifest.preview;",
)
replace_text(
    flagship_path,
    "${styles.preview} ${previewClassByCollection[collection]} ${compact ? styles.compact : ''}",
    "${styles.preview} ${previewStyles[collection] ?? ''} ${compact ? styles.compact : ''}",
)
replace_text(
    flagship_path,
    "{collectionOrdinal[collection.key]} · {collection.personality}",
    "{collection.ordinal} · {collection.personality}",
)

project_path = "src/components/projects/project-setup-form.tsx"
replace_text(
    project_path,
    "import type { InvitationTemplateKey } from '@/modules/invitation-templates/invitation-template.keys';\n",
    "import {\n  getDefaultInvitationThemePalette,\n  invitationThemePackages,\n  type InvitationTemplateKey,\n} from '@/modules/invitation-templates/core/theme-package.registry';\n",
)
replace_pattern(
    project_path,
    r"const collectionOptions: Array<\{.*?\n\];",
    normalized(
        r'''
        const collectionOptions = invitationThemePackages.map((themePackage) => {
          const palette = getDefaultInvitationThemePalette(themePackage.manifest.key);

          return {
            accent: palette.accent,
            canvas: palette.canvas,
            description: themePackage.manifest.description,
            frame: palette.paper,
            frameBorder: palette.soft,
            key: themePackage.manifest.key,
            name: themePackage.manifest.name,
            personality: themePackage.manifest.personality,
            text: palette.ink,
          };
        });
        '''
    ).rstrip(),
    flags=re.S,
)
replace_text(
    project_path,
    "className={`${collection.canvas} relative rounded-[2rem] p-4 shadow-[0_30px_80px_rgb(53_37_32_/_0.16)] sm:p-5`}",
    "className=\"relative rounded-[2rem] p-4 shadow-[0_30px_80px_rgb(53_37_32_/_0.16)] sm:p-5\"\n        style={{ backgroundColor: collection.canvas }}",
)
replace_text(
    project_path,
    "className={`${collection.frame} ${collection.text} relative flex aspect-[9/16] flex-col overflow-hidden rounded-[1.45rem] border px-7 py-8 text-center shadow-[0_16px_45px_rgb(36_29_27_/_0.13)]`}",
    "className=\"relative flex aspect-[9/16] flex-col overflow-hidden rounded-[1.45rem] border px-7 py-8 text-center shadow-[0_16px_45px_rgb(36_29_27_/_0.13)]\"\n          style={{\n            backgroundColor: collection.frame,\n            borderColor: collection.frameBorder,\n            color: collection.text,\n          }}",
)
replace_text(
    project_path,
    "className={`${collection.accent} text-[0.58rem] font-semibold tracking-[0.24em] uppercase`}",
    "className=\"text-[0.58rem] font-semibold tracking-[0.24em] uppercase\"\n            style={{ color: collection.accent }}",
)
project_source = (ROOT / project_path).read_text(encoding="utf-8")
project_source = project_source.replace(
    "className={`${collection.accent} my-3 text-xl italic`}",
    "className=\"my-3 text-xl italic\" style={{ color: collection.accent }}",
)
project_source = project_source.replace(
    "className={`${collection.accent} my-3 font-serif text-2xl italic`}",
    "className=\"my-3 font-serif text-2xl italic\" style={{ color: collection.accent }}",
)
project_source = project_source.replace(
    "className={`${collection.canvas} flex aspect-[4/5] items-center justify-center rounded-[0.85rem] p-2`}",
    "className=\"flex aspect-[4/5] items-center justify-center rounded-[0.85rem] p-2\"\n                        style={{ backgroundColor: collection.canvas }}",
)
project_source = project_source.replace(
    "className={`${collection.frame} ${collection.text} flex size-full items-center justify-center rounded-[0.55rem] border font-serif text-xl`}",
    "className=\"flex size-full items-center justify-center rounded-[0.55rem] border font-serif text-xl\"\n                          style={{\n                            backgroundColor: collection.frame,\n                            borderColor: collection.frameBorder,\n                            color: collection.text,\n                          }}",
)
if "collection.canvas}" in project_source or "collection.frame}" in project_source or "collection.accent}" in project_source:
    raise RuntimeError("Project setup still contains palette values inside Tailwind class strings.")
(ROOT / project_path).write_text(project_source, encoding="utf-8")

write(
    "tests/unit/invitation-theme-package-registry.test.ts",
    r'''
    import { readFileSync } from 'node:fs';
    import { resolve } from 'node:path';

    import { describe, expect, it } from 'vitest';

    import {
      DEFAULT_INVITATION_TEMPLATE_KEY,
      getDefaultInvitationThemePalette,
      getInvitationThemePackage,
      INVITATION_TEMPLATE_KEYS,
      invitationThemePackages,
    } from '../../src/modules/invitation-templates/core/theme-package.registry';
    import { invitationTemplateParityV1 } from '../../src/modules/invitation-templates/invitation-template-parity';

    describe('canonical invitation theme package registry', () => {
      it('owns the complete template key list and default package', () => {
        expect(INVITATION_TEMPLATE_KEYS).toEqual(['roselle', 'aruna', 'laras']);
        expect(getInvitationThemePackage(DEFAULT_INVITATION_TEMPLATE_KEY).manifest.key).toBe(
          DEFAULT_INVITATION_TEMPLATE_KEY,
        );
      });

      it.each(INVITATION_TEMPLATE_KEYS)('%s exposes one complete canonical package', (templateKey) => {
        const themePackage = getInvitationThemePackage(templateKey);
        const defaultPalette = getDefaultInvitationThemePalette(templateKey);

        expect(themePackage.manifest.key).toBe(templateKey);
        expect(themePackage.Renderer).toBeTypeOf('function');
        expect(themePackage.palettes.length).toBeGreaterThanOrEqual(4);
        expect(defaultPalette.key).toBe(themePackage.defaultPaletteKey);
        expect(themePackage.manifest.capabilities).toEqual({
          digitalGift: true,
          gallery: true,
          guestbook: true,
          multiEvent: true,
          personalGreeting: true,
          rsvp: true,
        });
        expect(invitationTemplateParityV1[templateKey]).toBe(themePackage.manifest.parity);
      });

      it('derives every package collection from the registry without duplicate keys', () => {
        expect(invitationThemePackages.map((themePackage) => themePackage.manifest.key)).toEqual(
          INVITATION_TEMPLATE_KEYS,
        );
        expect(new Set(INVITATION_TEMPLATE_KEYS).size).toBe(INVITATION_TEMPLATE_KEYS.length);
      });

      it('uses registry lookup instead of renderer-specific branches', () => {
        const rendererSource = readFileSync(
          resolve(process.cwd(), 'src/modules/invitation-templates/invitation-template-renderer.tsx'),
          'utf8',
        );

        expect(rendererSource).toContain('getInvitationTemplate(templateKey)');
        expect(rendererSource).not.toContain("templateKey === 'aruna'");
        expect(rendererSource).not.toContain("templateKey === 'laras'");
      });
    });
    ''',
)

print('V4C source transformation complete.')
