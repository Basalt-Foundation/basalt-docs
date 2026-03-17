import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/architecture',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'core-concepts/consensus',
        'core-concepts/cryptography',
        'core-concepts/networking',
        'core-concepts/storage',
        'core-concepts/execution',
        'core-concepts/fee-model',
      ],
    },
    {
      type: 'category',
      label: 'Smart Contracts',
      items: [
        'smart-contracts/overview',
        'smart-contracts/getting-started',
        'smart-contracts/sdk-reference',
        'smart-contracts/token-standards',
        'smart-contracts/policy-hooks',
        'smart-contracts/analyzers',
        'smart-contracts/testing',
      ],
    },
    {
      type: 'category',
      label: 'Caldera Fusion DEX',
      items: [
        'caldera/overview',
      ],
    },
    {
      type: 'category',
      label: 'Compliance & Privacy',
      items: [
        'compliance/overview',
        'compliance/zk-compliance',
        'compliance/confidential-transactions',
        'compliance/identity',
      ],
    },
    {
      type: 'category',
      label: 'Node Operations',
      items: [
        'node-operations/running-a-node',
        'node-operations/configuration',
        'node-operations/docker-devnet',
        'node-operations/rpc-node-mode',
        'node-operations/staking',
      ],
    },
    {
      type: 'category',
      label: 'APIs',
      items: [
        'apis/rest',
        'apis/grpc',
        'apis/graphql',
        'apis/websocket',
      ],
    },
    {
      type: 'category',
      label: 'CLI',
      items: [
        'cli/reference',
      ],
    },
    {
      type: 'category',
      label: 'EVM Bridge',
      items: [
        'bridge/overview',
      ],
    },
  ],
};

export default sidebars;
