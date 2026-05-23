import {
  Catalogue,
  Product,
  ProductCatalogue,
} from '../libs/types/product.type';

export const products: Product[] = [
  {
    id: '1',
    name: 'Caramel Latte',
    description: 'Smooth espresso with steamed milk and caramel drizzle.',
    price: 180,
    image:
      'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?q=80&w=987&auto=format&fit=crop...',
    status: 'active',
    catalogue: {
      name: 'Coffees',
      id: 2,
      shop_id: 101,
    },
  },
  {
    id: '5',
    name: 'Cappuccino',
    description: 'Classic espresso with steamed milk foam.',
    price: 170,
    badge: 'Popular',
    image:
      'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?q=80&w=1364&auto=format&fit=crop...',
    status: 'active',
    catalogue: {
      name: 'Coffees',
      id: 2,
      shop_id: 101,
    },
  },
  {
    id: '3',
    name: 'Iced Americano',
    description: 'Refreshing espresso diluted with cold water over ice.',
    price: 150,
    salePrice: 105,
    badge: 'New',
    image:
      'https://images.unsplash.com/photo-1595520519770-15d19939e648?q=80&w=2340&auto=format&fit=crop...',
    status: 'active',
    catalogue: {
      name: 'Coffees',
      id: 2,
      shop_id: 101,
    },
  },
  {
    id: '7',
    name: 'Espresso Shot',
    description: 'Strong and bold single shot of espresso.',
    price: 100,
    salePrice: 80,
    image:
      'https://images.unsplash.com/photo-1759259639364-d4cf34e61568?q=80&w=987&auto=format&fit=crop...',
    status: 'active',
    catalogue: {
      name: 'Coffees',
      id: 2,
      shop_id: 101,
    },
  },
  {
    id: '2',
    name: 'Butter Croissant',
    description: 'Flaky and buttery French-style pastry.',
    price: 120,
    image:
      'https://images.unsplash.com/photo-1587912001191-0cd4f14fd89e?q=80&w=2340&auto=format&fit=crop...',
    status: 'active',
    catalogue: {
      name: 'Pastries',
      id: 3,
      shop_id: 101,
    },
  },
  {
    id: '6',
    name: 'Blueberry Muffin',
    description: 'Moist muffin packed with fresh blueberries.',
    price: 110,
    salePrice: 85,
    badge: 'New',
    image:
      'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?q=80&w=2340&auto=format&fit=crop...',
    status: 'active',
    catalogue: {
      name: 'Pastries',
      id: 3,
      shop_id: 101,
    },
  },
  {
    id: '4',
    name: 'Chocolate Donut',
    description: 'Soft donut topped with rich chocolate glaze.',
    price: 90,
    salePrice: 75,
    image:
      'https://images.unsplash.com/photo-1657318415919-3beff167f849?q=80&w=1958&auto=format&fit=crop...',
    status: 'unlisted', // Testing an unlisted pastry
    catalogue: {
      name: 'Pastries',
      id: 3,
      shop_id: 101,
    },
  },
  {
    id: '8',
    name: 'Strawberry Danish',
    description: 'Sweet pastry filled with cream cheese and strawberries.',
    price: 140,
    badge: 'Popular',
    image:
      'https://images.unsplash.com/photo-1681218424681-b4f8228ecea9?q=80&w=1974&auto=format&fit=crop...',
    status: 'active',
    catalogue: {
      name: 'Pastries',
      id: 3,
      shop_id: 101,
    },
  },
];

export const productCatalogues: ProductCatalogue = [
  {
    name: 'Promos & Offers',
    id: 1,
    shop_id: 101,
    items: products.filter((p) => p.salePrice !== undefined),
  },
  {
    name: 'Coffees',
    id: 2,
    shop_id: 101,
    items: products.slice(0, 4),
  },
  {
    name: 'Pastries',
    id: 3,
    shop_id: 101,
    items: products.slice(4, 8),
  },
];

export const catalogues: Catalogue[] = [
  { id: 1, shop_id: 101, name: 'All' },
  { id: 2, shop_id: 101, name: 'Promos & Offers' },
  { id: 3, shop_id: 101, name: 'Coffees' },
  { id: 4, shop_id: 101, name: 'Pastries' },
];
