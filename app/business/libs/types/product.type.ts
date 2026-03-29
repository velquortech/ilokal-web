export interface Catalogue {
  id: number;
  shop_id: number;
  name: string;
}

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  salePrice?: number;
  image: string;
  badge?: string;
  status: 'active' | 'unlisted' | 'disabled';
  catalogue: Catalogue;
};

export type ProductCatalogue = (Catalogue & { items: Product[] })[];
