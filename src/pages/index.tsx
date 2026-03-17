import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

const stats = [
  {value: '4s', label: 'Finality'},
  {value: '7', label: 'Token Standards'},
  {value: '12', label: 'Analyzers'},
  {value: '4,000+', label: 'Tests'},
];

const features = [
  {
    icon: '{}',
    title: 'C# Smart Contracts',
    description:
      'Write contracts in familiar C# with StorageMap, StorageValue, and StorageList primitives. 12 Roslyn analyzers catch reentrancy, overflows, and non-determinism at compile time.',
  },
  {
    icon: '\u{1F6E1}',
    title: 'ZK Compliance',
    description:
      'Hybrid compliance engine: Groth16 ZK proofs verified first, on-chain attestation fallback. SchemaRegistry for credential schemas, IssuerRegistry with trust tiers.',
  },
  {
    icon: '\u{1F510}',
    title: 'Confidential Transactions',
    description:
      'Pedersen commitments on BLS12-381 hide amounts while proving balance validity. 192-byte Groth16 range proofs. X25519 private channels with AES-256-GCM.',
  },
  {
    icon: '\u{26A1}',
    title: '4-Second Finality',
    description:
      'BasaltBFT consensus with pipelined 3-phase commit and BLS12-381 signature aggregation. Stake-weighted leader selection with automatic slashing.',
  },
  {
    icon: '\u{1F517}',
    title: 'EVM Bridge',
    description:
      'Bidirectional bridge to Ethereum and Polygon with M-of-N Ed25519 multisig relayer and BLAKE3 Merkle proof verification.',
  },
  {
    icon: '\u{1F4CA}',
    title: 'Protocol-Native DEX',
    description:
      'Caldera Fusion: batch auction matching, TWAP oracle, concentrated liquidity, dynamic fees, and EC-ElGamal encrypted intents.',
  },
  {
    icon: '\u{1F3DB}',
    title: 'On-Chain Governance',
    description:
      'Stake-weighted quadratic voting with delegation and timelock execution. Proposals execute cross-contract calls on approval.',
  },
  {
    icon: '\u{1F50D}',
    title: 'Policy Hooks',
    description:
      'Pluggable transfer policies on every token standard. Enforce holding limits, lockups, jurisdiction whitelists, and sanctions screening.',
  },
  {
    icon: '\u{1F3D7}',
    title: '.NET 9 Native AOT',
    description:
      'Single self-contained binary. Predictable latency, no GC pauses during consensus, minimal memory footprint with ahead-of-time compilation.',
  },
];

const quickLinks = [
  {label: 'Installation', to: '/docs/getting-started/installation'},
  {label: 'Write a Contract', to: '/docs/smart-contracts/getting-started'},
  {label: 'Run a Node', to: '/docs/node-operations/running-a-node'},
  {label: 'REST API', to: '/docs/apis/rest'},
  {label: 'Token Standards', to: '/docs/smart-contracts/token-standards'},
  {label: 'Docker DevNet', to: '/docs/node-operations/docker-devnet'},
  {label: 'CLI Reference', to: '/docs/cli/reference'},
  {label: 'EVM Bridge', to: '/docs/bridge/overview'},
];

function HomepageHeader() {
  return (
    <header className="hero--basalt">
      <div className="container">
        <h1 className="hero__title">Basalt Documentation</h1>
        <p className="hero__subtitle">
          Build on the compliance-native Layer 1 blockchain. C# smart contracts,
          zero-knowledge compliance, confidential transactions, and a protocol-native DEX.
        </p>
        <div style={{display: 'flex', gap: '0.75rem', marginTop: '2rem', flexWrap: 'wrap'}}>
          <Link className="button button--primary button--lg" to="/docs/">
            Get Started
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            to="/docs/core-concepts/consensus">
            Core Concepts
          </Link>
        </div>
        <div className="stats-row">
          {stats.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Home"
      description="Basalt — Compliance-Native Layer 1 Blockchain on .NET 9 Native AOT. C# smart contracts, ZK compliance, confidential transactions.">
      <HomepageHeader />
      <main>
        <div className="container">
          <section className="feature-grid">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </div>
            ))}
          </section>

          <h2 style={{fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem'}}>
            Quick Links
          </h2>
          <div className="quick-links">
            {quickLinks.map((link) => (
              <Link key={link.to} className="quick-link" to={link.to}>
                {link.label}
                <span>&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </Layout>
  );
}
