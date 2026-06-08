const WORDS = [
  // Animals
  'elephant', 'butterfly', 'penguin', 'giraffe', 'octopus', 'flamingo', 'kangaroo', 'chameleon',
  // Food
  'pizza', 'spaghetti', 'hamburger', 'watermelon', 'strawberry', 'broccoli', 'sushi', 'taco',
  // Objects
  'telescope', 'umbrella', 'lighthouse', 'bicycle', 'guitar', 'helicopter', 'submarine', 'compass',
  // Actions
  'swimming', 'dancing', 'climbing', 'juggling', 'surfing', 'painting', 'cooking', 'sleeping',
  // Places
  'volcano', 'castle', 'pyramid', 'igloo', 'treehouse', 'aquarium', 'stadium', 'library',
  // Nature
  'rainbow', 'tornado', 'avalanche', 'thunderstorm', 'glacier', 'canyon', 'waterfall', 'aurora',
  // Misc
  'robot', 'dragon', 'mermaid', 'wizard', 'superhero', 'astronaut', 'pirate', 'ninja'
];

const ROUND_DURATION = 120; // seconds
const MAX_PLAYERS = 4;
const POINTS_PER_CORRECT = 1;

const TURN_ORDER = [0, 2, 1, 3]; // P1, P3, P2, P4 (alternating teams)

module.exports = { WORDS, ROUND_DURATION, MAX_PLAYERS, POINTS_PER_CORRECT, TURN_ORDER };
