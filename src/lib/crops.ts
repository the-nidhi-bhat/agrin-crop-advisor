export interface CropOption {
  id: string;
  name: string;
  tip: string;
}

export const CROPS: CropOption[] = [
  { id: 'tomato', name: 'Tomato', tip: 'Leaf spots, curling, or fruit damage.' },
  { id: 'chili', name: 'Chili', tip: 'Spots or curling on leaves and fruit.' },
  { id: 'paddy', name: 'Paddy', tip: 'Leaf blades with spots or discolouration.' },
  { id: 'cotton', name: 'Cotton', tip: 'Leaf spots, wilting, or boll damage.' },
  { id: 'soybean', name: 'Soybean', tip: 'Leaf spots, yellowing, or wilt.' },
  { id: 'wheat', name: 'Wheat', tip: 'Streaks, rust pustules, or leaf discolouration.' },
  { id: 'maize', name: 'Maize', tip: 'Ragged lesions or discoloured streaks on leaves.' },
  { id: 'groundnut', name: 'Groundnut', tip: 'Circular leaf spots or yellowing.' },
  { id: 'sugarcane', name: 'Sugarcane', tip: 'Striped or reddened lesions on leaves.' },
  { id: 'onion', name: 'Onion', tip: 'Blotches, yellowing leaf tips, or rot.' },
];