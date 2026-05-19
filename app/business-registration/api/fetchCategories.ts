import { http } from '@/services';
import { Coffee, Store, Scissors, Plane, LucideIcon } from 'lucide-react';

// A map to turn the string stored in the DB back into a Component
const iconMap: Record<string, LucideIcon> = {
  Coffee: Coffee,
  Store: Store,
  Scissors: Scissors,
  Plane: Plane,
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

type BusinessTypeReturnProps = Omit<BusinessType, 'icon' | 'items'> & {
  icon: keyof typeof iconMap;
  business_categories: (Omit<BusinessCategory, 'imageURL'> & {
    image_url: string;
  })[];
};

export const fetchBusinessData = async (): Promise<BusinessType[]> => {
  const data = await http.get<BusinessTypeReturnProps[]>('/business-types');

  return data.map((type) => ({
    name: type.name,
    description: type.description,
    icon: iconMap[type.icon] || Coffee,
    items: type.business_categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      imageURL: cat.image_url,
    })),
  }));
};
