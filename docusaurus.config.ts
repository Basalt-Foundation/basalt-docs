import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Basalt',
  tagline: 'Enterprise-Grade Blockchain on .NET 9 AOT',
  favicon: 'img/favicon.ico',

  url: 'https://basalt-foundation.github.io',
  baseUrl: '/basalt-docs/',

  organizationName: 'basalt-foundation',
  projectName: 'basalt-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    format: 'md',
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/basalt-foundation/basalt-docs/tree/main/',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'Basalt',
      logo: {
        alt: 'Basalt Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/basalt-foundation',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started/installation',
            },
            {
              label: 'Core Concepts',
              to: '/docs/core-concepts/consensus',
            },
            {
              label: 'Smart Contracts',
              to: '/docs/smart-contracts/overview',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Design Plan',
              to: '/docs/specifications/design-plan',
            },
            {
              label: 'Technical Spec',
              to: '/docs/specifications/technical-spec',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/basalt-foundation',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Basalt Foundation. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['csharp', 'protobuf', 'docker', 'bash', 'json', 'graphql'],
    },
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
