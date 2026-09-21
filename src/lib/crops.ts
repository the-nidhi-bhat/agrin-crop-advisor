export interface CropOption {
  id: string;
  name: string;
  tip: string;
}

export const CROPS: CropOption[] = [
  { id: 'tomato', name: 'Tomato', tip: 'Leaf spots, curling, or fruit damage.' },
  { id: 'chili', name: 'Chili', tip: 'Spots or curling on leaves and fruit.' },
  { id: 'paddy', name: 'Paddy', tip: 'Leaf blades with spots or discolouration.' },
];