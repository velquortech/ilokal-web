import { Coffee, Store, Scissors, Plane } from 'lucide-react';

export const businessTypes = [
  {
    name: 'Food & Beverage',
    description:
      'Businesses that serve food and drinks, ranging from cafés and restaurants to bakeries and street vendors.',
    icon: Coffee,
    items: [
      {
        name: 'Café',
        description: 'A casual spot serving coffee, tea, and light meals.',
        imageURL:
          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Restaurant',
        description:
          'Full-service dining establishments offering meals and beverages.',
        imageURL:
          'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Bar / Pub',
        description: 'Social venues serving alcoholic drinks and light snacks.',
        imageURL:
          'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Bakery / Pastry Shop',
        description: 'Shops specializing in bread, cakes, and pastries.',
        imageURL:
          'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Street Food Vendor',
        description:
          'Small stalls or carts offering quick, affordable local food.',
        imageURL:
          'https://images.unsplash.com/photo-1664612702379-94f5b5030803?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
    ],
  },
  {
    name: 'Retail',
    description:
      'Shops that sell goods directly to customers, including groceries, specialty stores, clothing, and books.',
    icon: Store,
    items: [
      {
        name: 'Local Grocery / Convenience Store',
        description:
          'Neighborhood stores selling daily essentials and fresh produce.',
        imageURL:
          'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Specialty Shop',
        description: 'Stores offering unique crafts, souvenirs, or delicacies.',
        imageURL:
          'https://images.unsplash.com/photo-1628602592413-cdb2aaf0a353?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Clothing & Apparel',
        description: 'Fashion boutiques and apparel shops for everyday wear.',
        imageURL:
          'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Bookstore / Stationery',
        description: 'Shops selling books, magazines, and writing supplies.',
        imageURL:
          'https://images.unsplash.com/photo-1512820790803-83ca734da794',
      },
    ],
  },
  {
    name: 'Services',
    description:
      'Service-oriented businesses offering personal care, wellness, fitness, or repair solutions.',
    icon: Scissors,
    items: [
      {
        name: 'Salon / Barbershop',
        description: 'Hair and grooming services for men and women.',
        imageURL:
          'https://images.unsplash.com/photo-1629397685944-7073f5589754?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Spa / Wellness Center',
        description:
          'Facilities offering relaxation, massage, and wellness treatments.',
        imageURL:
          'https://images.unsplash.com/photo-1600334129128-685c5582fd35?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Fitness Studio / Gym',
        description:
          'Spaces for exercise, training, and group fitness classes.',
        imageURL:
          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Repair Services',
        description:
          'Shops providing repair for electronics, tailoring, and more.',
        imageURL:
          'https://images.unsplash.com/photo-1563770660941-20978e870e26?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
    ],
  },
  {
    name: 'Tourism & Leisure',
    description:
      'Businesses that cater to tourists and leisure activities, such as accommodations, tours, cultural experiences, and entertainment venues.',
    icon: Plane,
    items: [
      {
        name: 'Bed & Breakfast / Guesthouse',
        description:
          'Small lodging establishments offering overnight stays and breakfast.',
        imageURL:
          'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Cultural Experience Provider',
        description:
          'Workshops or classes showcasing local traditions and skills.',
        imageURL:
          'https://images.unsplash.com/photo-1560831340-b9679dc9e9f0?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
      {
        name: 'Entertainment Venue',
        description:
          'Spaces for live music, karaoke, theater, and social events.',
        imageURL:
          'https://images.unsplash.com/photo-1766532721742-186e96e3db3a?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      },
    ],
  },
];
