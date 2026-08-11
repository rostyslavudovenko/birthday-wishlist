export type Gift = {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  storeUrl: string | null;
  displayOrder: number;
  isReserved: boolean;
};
