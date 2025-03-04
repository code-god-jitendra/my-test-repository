// server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
// jStat is still installed in case you want to experiment further.
const jStat = require('jstat');

const app = express();

// Middleware: parse JSON bodies and serve static files from "public".
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Game Configuration ---
const STARTING_BALANCE = 1000.0;
const MIN_WIN_CHANCE = 0.01; // Minimum win chance (1%)

// Global user state (for simplicity; use sessions in production)
const user = {
  balance: STARTING_BALANCE,
  totalBet: 0.0
};

/**
 * getAdvancedWinProbability
 *
 * 1. Computes the fair probability as: fairProbability = 1 / multiplier.
 * 2. Computes an experience bonus that continuously decreases with higher total bets.
 *    We use the formula:
 *
 *       bonusExperience = k1 * (1 - 2 * (userTotalBet / (userTotalBet + C)))
 *
 *    • When userTotalBet is near zero, bonusExperience ≈ k1 (a bonus).
 *    • As userTotalBet grows, bonusExperience continuously decreases and approaches -k1.
 *
 * 3. Computes a balance penalty:
 *
 *       penaltyBalance = k2 * (1 - currentBalance / STARTING_BALANCE)
 *
 *    • If the balance is at the starting level, penaltyBalance = 0.
 *    • If the balance is lower, penaltyBalance becomes positive.
 *
 * 4. The total bonusFactor is then:
 *
 *       bonusFactor = bonusExperience - penaltyBalance
 *
 * 5. Finally, the adjusted win chance is:
 *
 *       adjustedWinChance = fairProbability * (1 + bonusFactor)
 *
 *    and is clamped between MIN_WIN_CHANCE and 1.
 */
function getAdvancedWinProbability(multiplier, userTotalBet, currentBalance) {
  const fairProbability = 1.0 / multiplier;

  // Constants for continuous adjustment:
  const C = 1000.0; // Experience scaling constant.
  const k1 = 0.5;   // Maximum bonus when new (and conversely, maximum penalty for very high bets).
  const k2 = 0.2;   // Penalty factor for balance drop.

  // Experience factor: when userTotalBet is low, bonus is high; as bets increase, it drops continuously.
  const bonusExperience = k1 * (1 - 2 * (userTotalBet / (userTotalBet + C)));
  
  // Balance penalty: if current balance is below starting balance, apply a continuous penalty.
  const penaltyBalance = k2 * (1 - currentBalance / STARTING_BALANCE);
  
  // Total bonus factor.
  const bonusFactor = bonusExperience - penaltyBalance;
  
  // Compute the adjusted win chance.
  let adjustedWinChance = fairProbability * (1 + bonusFactor);
  
  // Clamp the win chance.
  if (adjustedWinChance < MIN_WIN_CHANCE) adjustedWinChance = MIN_WIN_CHANCE;
  if (adjustedWinChance > 1) adjustedWinChance = 1;
  
  return adjustedWinChance;
}

/**
 * playRound updates the user state based on the bet and multiplier.
 * It uses getAdvancedWinProbability to decide win/loss.
 */
function playRound(betAmount, chosenMultiplier) {
  user.totalBet += betAmount;
  
  const winChance = getAdvancedWinProbability(chosenMultiplier, user.totalBet, user.balance);
  const randomValue = Math.random();
  let outcome = { winChance: winChance };
  
  if (randomValue <= winChance) {
    // Win scenario: calculate payout.
    const payout = betAmount * chosenMultiplier;
    const netGain = payout - betAmount;
    user.balance += netGain;
    outcome.win = true;
    outcome.payout = payout;
    outcome.netGain = netGain;
  } else {
    // Loss scenario: deduct bet.
    user.balance -= betAmount;
    outcome.win = false;
    outcome.lost = betAmount;
  }
  
  // Include current user state in the outcome.
  outcome.balance = user.balance;
  outcome.totalBet = user.totalBet;
  
  return outcome;
}

// API endpoint to play a round.
app.post('/play', (req, res) => {
  const { betAmount, chosenMultiplier } = req.body;
  if (betAmount == null || chosenMultiplier == null) {
    return res.status(400).json({ error: 'Missing betAmount or chosenMultiplier' });
  }
  if (betAmount > user.balance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  const outcome = playRound(betAmount, chosenMultiplier);
  return res.json(outcome);
});

// API endpoint to return current user state.
app.get('/status', (req, res) => {
  return res.json(user);
});

// Start the server.
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
