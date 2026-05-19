import { Coffee, Store, Scissors, Plane, LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Coffee,
  Store,
  Scissors,
  Plane,
};

export type BusinessCategory = {
  id: string;
  name: string;
  description: string;
  imageURL: string;
};

export type BusinessType = {
  name: string;
  description: string;
  icon: LucideIcon;
  items: BusinessCategory[];
};

export type RawBusinessCategory = {
  id: string;
  name: string;
  description: string;
  image_url: string;
};

export type RawBusinessType = {
  name: string;
  description: string;
  icon: string;
  business_categories: RawBusinessCategory[];
};

export function transformBusinessTypes(raw: RawBusinessType[]): BusinessType[] {
  return raw.map((type) => ({
    name: type.name,
    description: type.description,
    icon: iconMap[type.icon] ?? Coffee,
    items: type.business_categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      imageURL: cat.image_url,
    })),
  }));
}
