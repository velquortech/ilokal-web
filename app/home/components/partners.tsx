import { JSX } from 'react';
import Image from 'next/image';
import FadeInOnScroll from '@/components/custom/FadeInOnScroll';

export function Partners(): JSX.Element {
  const partnerLogos = [
    {
      title: 'OpenAI',
      image: 'openai.png',
    },
    {
      title: 'hellopatient',
      image: 'character-ai.png',
    },
    {
      title: 'granola',
      image: 'granola.png',
    },
    {
      title: 'character ai',
      image: 'hellopatient.png',
    },
  ];

  return (
    <div className="text-center text-2xl">
      <FadeInOnScroll>
        <h1 className="mx-auto max-w-1/2 font-medium">
          Trusted by modern operators across industries. From pilot to scale
          without chaos.
        </h1>
      </FadeInOnScroll>

      <FadeInOnScroll>
        <section className="flex items-center justify-center gap-24 pt-10">
          {partnerLogos.map((item, index) => (
            <Image
              key={`${item.title}-${index}`}
              src={`/images/${item.image}`}
              width={200}
              height={100}
              alt={`${item.title}-logo-${index}`}
              unoptimized
              className="h-12 w-auto object-contain dark:invert"
            />
          ))}
        </section>
      </FadeInOnScroll>
    </div>
  );
}
