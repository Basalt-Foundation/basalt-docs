import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

function Feature({title, description}: {title: string; description: string}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="padding-horiz--md padding-vert--lg">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

const features = [
  {
    title: 'Native .NET 9 AOT',
    description:
      'Single self-contained binary with no JIT overhead. Sub-millisecond startup, predictable latency, and minimal memory footprint.',
  },
  {
    title: 'C# Smart Contracts',
    description:
      'Write contracts in familiar C# with strong typing, Roslyn analyzers, and full debugging support in Visual Studio and Rider.',
  },
  {
    title: 'Enterprise Compliance',
    description:
      'Built-in KYC/AML, MiCA, and GDPR compliance at the protocol level. Identity registry, sanctions screening, and audit trails.',
  },
  {
    title: 'Fast Finality',
    description:
      'BasaltBFT consensus delivers deterministic finality in 800ms with BLS12-381 signature aggregation and pipelined block production.',
  },
  {
    title: 'Proven Cryptography',
    description:
      'BLAKE3 hashing (6x faster than SHA-256), Ed25519 signatures, BLS12-381 aggregation, and EVM-compatible Keccak-256 addresses.',
  },
  {
    title: 'EVM Bridge',
    description:
      'Bidirectional bridge to Ethereum and Polygon with multisig relayer, Merkle proof verification, and wrapped BST tokens.',
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary')} style={{padding: '4rem 0'}}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem'}}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/">
            Get Started
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            to="/docs/core-concepts/consensus">
            Core Concepts
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="Basalt - Enterprise-Grade Layer 1 Blockchain on .NET 9 AOT">
      <HomepageHeader />
      <main>
        <section style={{padding: '2rem 0'}}>
          <div className="container">
            <div className="row">
              {features.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
