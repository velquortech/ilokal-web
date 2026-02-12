import { JSX } from 'react';
import FadeInOnScroll from '@/components/custom/FadeInOnScroll';

export function AIAgents(): JSX.Element {
  return (
    <div>
      <section className="space-y-6">
        <h1 className="text-title">Governed AI,</h1>
        <h2 className="text-title">Trusted Outcomes</h2>
        <p className="max-w-1/2 text-xl text-gray-500">
          Your personal AI assistance that will assist you, and produce
          insightful suggestions to push your business even further
        </p>
      </section>

      <FadeInOnScroll>
        <div className="relative flex h-screen w-full flex-col items-center overflow-hidden">
          <div className="perspective-1000 pointer-events-none absolute left-[-10%] h-full w-[120%] select-none">
            <div
              className="relative top-[-100] h-full w-full"
              style={{
                transform:
                  'rotateX(20deg) rotateY(-2deg) rotateZ(-5deg) scale(0.8)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="absolute inset-0 top-20 w-full rounded-xl bg-cover bg-no-repeat"
                style={{
                  backgroundImage:
                    "url('/images/sample-dashboard-analytics.png')",
                  maskImage:
                    'linear-gradient(to bottom right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)',
                  WebkitMaskImage:
                    'linear-gradient(to bottom right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)',
                }}
              >
                <div className="absolute inset-0 bg-white/10"></div>
              </div>

              <div
                className="bg-white-900/50 absolute inset-0 -z-10 translate-x-10 translate-y-10 rounded-xl"
                style={{
                  maskImage:
                    'linear-gradient(to bottom right, black, transparent)',
                }}
              ></div>
            </div>
          </div>

          <div className="pointer-events-none absolute top-0 left-0 h-[500px] w-[500px] rounded-full bg-white/5 blur-[100px]"></div>

          <div className="absolute bottom-0 z-30 h-32 w-full bg-gradient-to-t from-white to-transparent"></div>
        </div>
      </FadeInOnScroll>
    </div>
  );
}
