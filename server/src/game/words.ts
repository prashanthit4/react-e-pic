export const WORDS: readonly string[] = [
  // Animals
  'elephant', 'butterfly', 'penguin', 'giraffe', 'octopus', 'flamingo',
  'kangaroo', 'chameleon', 'dolphin', 'porcupine', 'platypus', 'cheetah',
  // Food
  'pizza', 'spaghetti', 'hamburger', 'watermelon', 'strawberry', 'broccoli',
  'sushi', 'taco', 'croissant', 'pretzel', 'doughnut', 'pineapple',
  // Objects
  'telescope', 'umbrella', 'lighthouse', 'bicycle', 'guitar', 'helicopter',
  'submarine', 'compass', 'microscope', 'accordion', 'typewriter', 'parachute',
  // Actions
  'swimming', 'dancing', 'climbing', 'juggling', 'surfing', 'painting',
  'cooking', 'sleeping', 'skydiving', 'skateboarding', 'knitting', 'sneezing',
  // Places
  'volcano', 'castle', 'pyramid', 'igloo', 'treehouse', 'aquarium',
  'stadium', 'library', 'lighthouse', 'windmill', 'skyscraper', 'waterfall',
  // Nature
  'rainbow', 'tornado', 'avalanche', 'thunderstorm', 'glacier', 'canyon',
  'aurora', 'tsunami', 'desert', 'coral reef', 'quicksand', 'geyser',
  // Fictional / fun
  'robot', 'dragon', 'mermaid', 'wizard', 'superhero', 'astronaut',
  'pirate', 'ninja', 'vampire', 'werewolf', 'zombie', 'unicorn',
  // Concepts
  'shadow', 'reflection', 'explosion', 'gravity', 'echo', 'mirage',
  'labyrinth', 'tornado', 'avalanche', 'blizzard', 'hurricane', 'earthquake',
];

export function getRandomWord(exclude?: string | null): string {
  const pool = exclude ? WORDS.filter(w => w !== exclude) : WORDS;
  return pool[Math.floor(Math.random() * pool.length)] as string;
}
