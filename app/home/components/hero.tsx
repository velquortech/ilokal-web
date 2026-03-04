'use client';

import { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { FadeInAnimation } from '@/components/custom/FadeInAnimation';

export function Hero(): JSX.Element {
  return (
    <div>
      <section className="space-y-6">
        <FadeInAnimation delay={0.1}>
          <h1 className="font-bold sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Agents that do the work
          </h1>
          <h2 className="bg-app-color font-bold text-transparent sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Approvals that keep you safe
          </h2>
        </FadeInAnimation>
        <FadeInAnimation delay={0.2}>
          <p className="max-w-1/2 text-xl text-gray-500">
            Deploy AI agents that plan, act through your tools, and report
            outcomes-without changing how your teams work.
          </p>
        </FadeInAnimation>

        <FadeInAnimation delay={0.3}>
          <div className="space-x-4">
            <Button variant="outline" className="cursor-pointer">
              Start your Free Trial
            </Button>
            <Button className="cursor-pointer">View role based demos</Button>
          </div>
        </FadeInAnimation>
      </section>

      <FadeInAnimation delay={0.4}>
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
                  backgroundImage: "url('/images/dashboard-sample.png')",
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

          <div className="pointer-events-none absolute top-0 left-0 h-125 w-125 rounded-full bg-white/5 blur-[100px]"></div>

          <div className="absolute bottom-0 z-30 h-32 w-full bg-linear-to-t from-white to-transparent"></div>
        </div>
      </FadeInAnimation>
    </div>
  );
}
