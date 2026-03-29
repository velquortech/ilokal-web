import { businessTypes } from '@/app/business-registration/data/categories';
import { Badge, Check, CircleDotDashed, MapPin } from 'lucide-react';
import Image from 'next/image';

export function ShopBanner() {
  return (
    <div className="bg-muted border-border relative flex h-72 w-full flex-row items-end justify-between overflow-hidden rounded-xl border p-6 shadow-sm">
      <Image
        alt="background-image"
        src={businessTypes[0].items[0].imageURL}
        fill
        className="absolute top-0 left-0 h-full w-full object-cover"
        loading="eager"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      />
      <div className="z-10 inline-flex gap-4">
        <div className="text-primary bg-primary/30 flex size-20 items-center justify-center rounded-xl">
          <CircleDotDashed className="size-8" />
        </div>
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-2.5 text-2xl font-semibold text-white">
            Ilokal Shop
            <div className="relative flex p-1.5">
              <Badge className="fill-primary text-primary absolute top-0 left-0 z-0 size-full" />
              <Check className="z-20 size-3 text-white" />
            </div>
          </div>
          <p className="max-w-xl text-sm text-pretty text-white">
            An editorial-inspired sanctuary in the heart of Iloilo City. We
            specialize in artisanal roasts, rare loose-leaf infusions, and
            handcrafted pastries made fresh every sunrise.
          </p>
        </div>
      </div>
      <div className="z-10 flex flex-col text-end text-sm">
        <div className="inline-flex items-center gap-2 font-medium text-white">
          <MapPin className="size-4" />
          <p>Iloilo City, Philippines, 6000</p>
        </div>
        <span className="text-white/60">Food & Beverage • Café</span>
      </div>
    </div>
  );
}
