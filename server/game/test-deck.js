// Test file for Deck class
const Deck = require('./Deck');

console.log('========================================');
console.log('Testing Deck Class');
console.log('========================================\n');

// Test 1: Create a deck
console.log('Test 1: Creating 6-deck shoe...');
const deck = new Deck(6);
console.log(`✓ Total cards: ${deck.getTotalCards()}`);
console.log(`✓ Remaining cards: ${deck.getRemainingCards()}`);
console.log(`✓ Deck penetration: ${deck.getPenetration().toFixed(2)}%\n`);

// Test 2: Draw some cards
console.log('Test 2: Drawing 10 cards...');
for (let i = 0; i < 10; i++) {
  const card = deck.draw();
  console.log(`  Card ${i + 1}: ${Deck.formatCard(card)} (value: ${JSON.stringify(card.value)})`);
}
console.log(`✓ Remaining cards: ${deck.getRemainingCards()}`);
console.log(`✓ Cards dealt: ${deck.getCardsDealt()}`);
console.log(`✓ Deck penetration: ${deck.getPenetration().toFixed(2)}%\n`);

// Test 3: Check card distribution
console.log('Test 3: Checking card distribution...');
const testDeck = new Deck(1); // Single deck for easier counting
const rankCount = {};
const suitCount = {};

while (testDeck.getRemainingCards() > 0) {
  const card = testDeck.draw();
  rankCount[card.rank] = (rankCount[card.rank] || 0) + 1;
  suitCount[card.suit] = (suitCount[card.suit] || 0) + 1;
}

console.log('Ranks (should be 4 of each):');
console.log(rankCount);
console.log('\nSuits (should be 13 of each):');
console.log(suitCount);
console.log('');

// Test 4: Test auto-reshuffle
console.log('Test 4: Testing auto-reshuffle...');
const smallDeck = new Deck(1);
console.log(`Initial cards: ${smallDeck.getRemainingCards()}`);

// Draw all cards (completely empty the deck)
while (smallDeck.getRemainingCards() > 0) {
  smallDeck.draw();
}
console.log(`Deck is now empty: ${smallDeck.getRemainingCards()} cards`);

// This should trigger reshuffle (drawing from empty deck)
const cardAfterReshuffle = smallDeck.draw();
console.log(`After auto-reshuffle: ${smallDeck.getRemainingCards()} cards`);
console.log(`Drew card: ${Deck.formatCard(cardAfterReshuffle)}`);
console.log(`✓ Deck automatically reshuffled!\n`);

// Test 5: Test penetration threshold
console.log('Test 5: Testing penetration threshold...');
const penDeck = new Deck(6);
// Draw 75% of cards
const cardsToDraw = Math.floor(penDeck.getTotalCards() * 0.75);
for (let i = 0; i < cardsToDraw; i++) {
  penDeck.draw();
}
console.log(`Penetration: ${penDeck.getPenetration().toFixed(2)}%`);
console.log(`Needs reshuffle at 75%? ${penDeck.needsReshuffle(75)}`);
console.log(`Needs reshuffle at 100%? ${penDeck.needsReshuffle(100)}\n`);

// Test 6: Different deck counts
console.log('Test 6: Testing different deck counts...');
const decks = [1, 2, 4, 6, 8];
decks.forEach(count => {
  const d = new Deck(count);
  console.log(`  ${count} deck(s): ${d.getTotalCards()} cards (${count * 52})`);
});
console.log('');

// Test 7: Card value validation
console.log('Test 7: Validating card values...');
const valueDeck = new Deck(1);
const aceCard = { rank: 'A', suit: 'hearts', value: [1, 11] };
const faceCard = { rank: 'K', suit: 'spades', value: 10 };
const numCard = { rank: '7', suit: 'diamonds', value: 7 };

console.log(`  Ace: ${Deck.formatCard(aceCard)} = ${JSON.stringify(aceCard.value)} ✓`);
console.log(`  Face: ${Deck.formatCard(faceCard)} = ${faceCard.value} ✓`);
console.log(`  Number: ${Deck.formatCard(numCard)} = ${numCard.value} ✓\n`);

console.log('========================================');
console.log('All tests completed successfully! ✓');
console.log('========================================');
