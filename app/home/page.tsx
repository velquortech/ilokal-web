import { Hero } from './components/hero';
import { Partners } from './components/partners';
import { Objectives } from './components/objectives';
import { AIAgents } from './components/ai-agents';
import { Pricing } from './components/pricing';

export default async function Home() {
  return (
    <main className="mt-20 space-y-18">
      <Hero />
      <Partners />
      <Objectives />
      <AIAgents />
      <Pricing />
    </main>
  );
}
