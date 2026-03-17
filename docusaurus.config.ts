import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Basalt',
  tagline: 'Compliance-Native Layer 1 Blockchain on .NET 9 Native AOT',
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
          to: '/docs/smart-contracts/overview',
          label: 'Smart Contracts',
          position: 'left',
        },
        {
          to: '/docs/apis/rest',
          label: 'API',
          position: 'left',
        },
        {
          href: 'https://basalt.foundation',
          label: 'Website',
          position: 'right',
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
          title: 'Learn',
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
          title: 'Develop',
          items: [
            {
              label: 'REST API',
              to: '/docs/apis/rest',
            },
            {
              label: 'CLI Reference',
              to: '/docs/cli/reference',
            },
            {
              label: 'Token Standards',
              to: '/docs/smart-contracts/token-standards',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/rXpgNRt3RV',
            },
            {
              label: 'X (Twitter)',
              href: 'https://x.com/basaltEU',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/basalt-foundation',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Website',
              href: 'https://basalt.foundation',
            },
            {
              label: 'Whitepapers',
              href: 'https://basalt.foundation/whitepapers',
            },
            {
              label: 'Caldera DEX',
              href: 'https://caldera.basalt.foundation',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Basalt Foundation.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['csharp', 'protobuf', 'docker', 'bash', 'json', 'graphql', 'toml', 'yaml'],
    },
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
