#include <iostream>
#include <random>
#include <iomanip>
#include <limits>

using namespace std;

// Global configuration parameters.
const double STARTING_BALANCE        = 1000.0;  // The starting balance for the user.
const double BASE_HOUSE_EDGE         = 0.05;    // Base house edge (5%) for new/low-stake players.
const double MIN_WIN_CHANCE          = 0.01;    // Minimum win chance (1%).
const double SLIPPERY_SLOPE_EXTRA_EDGE = 0.10;  // Extra house edge if balance falls below the starting balance (10%).

// A simple structure to track the user's state.
struct User {
    double balance;
    double totalBet;
};

// Structure to hold the outcome of a round.
struct Outcome {
    bool win;
    double payout;
    double netGain;
    double winChance;
    double lost;
};

/**
 * Calculates the current house edge based on the cumulative amount the user has bet.
 * New or low-stake players only face the base edge. For bets above a threshold, an extra edge
 * is added (e.g., 1% for every extra $100), capped at an additional 10%.
 */
double calculateHouseEdge(double userTotalBet) {
    const double threshold = 1000.0;
    if (userTotalBet <= threshold) {
        return BASE_HOUSE_EDGE;
    } else {
        double extraEdge = ((userTotalBet - threshold) / 100.0) * 0.01;
        if (extraEdge > 0.10)
            extraEdge = 0.10;  // cap the extra edge at 10%
        return BASE_HOUSE_EDGE + extraEdge;
    }
}

/**
 * Calculates the effective win probability for a given payout multiplier.
 * The "fair" probability is defined as 1/M (for a multiplier M) and is reduced by the house edge.
 * If the user’s current balance is below the starting balance, an extra penalty (slippery slope)
 * is applied. The win chance is never allowed to fall below a minimum threshold.
 *
 * @param multiplier   The payout multiplier chosen by the user.
 * @param userTotalBet The total amount the user has bet so far.
 * @param currentBalance The user’s current balance.
 * @return             The effective probability (between MIN_WIN_CHANCE and 1) that the user wins the round.
 */
double getWinProbability(double multiplier, double userTotalBet, double currentBalance) {
    double fairProbability = 1.0 / multiplier;  // e.g., 1/2 for a 2x payout.
    double houseEdge = calculateHouseEdge(userTotalBet);
    
    // If the user's balance has fallen below the starting balance,
    // add an extra house edge penalty (the "slippery slope").
    if (currentBalance < STARTING_BALANCE) {
        houseEdge += SLIPPERY_SLOPE_EXTRA_EDGE;
    }
    
    double winProbability = fairProbability - houseEdge;
    
    // Ensure that win probability does not fall below the minimum win chance.
    if (winProbability < MIN_WIN_CHANCE)
        winProbability = MIN_WIN_CHANCE;
    
    return winProbability;
}

/**
 * Simulates a single round of the betting game.
 *
 * @param user             A reference to the User struct tracking balance and total bet.
 * @param betAmount        The amount the user bets this round.
 * @param chosenMultiplier The payout multiplier chosen by the user (e.g., 1.15, 2.0, etc.).
 * @param rng              A reference to the random number generator.
 * @return                 An Outcome struct with details of the round's result.
 */
Outcome playRound(User &user, double betAmount, double chosenMultiplier, std::mt19937 &rng) {
    // Update the user's cumulative bet amount.
    user.totalBet += betAmount;
    
    // Calculate the win chance using the current balance.
    double winChance = getWinProbability(chosenMultiplier, user.totalBet, user.balance);
    
    // Generate a random value between 0 and 1.
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    double randomValue = dist(rng);
    
    Outcome outcome;
    outcome.winChance = winChance;
    
    if (randomValue <= winChance) {
        // The user wins this round.
        double payout = betAmount * chosenMultiplier;
        double netGain = payout - betAmount;  // profit from the round.
        user.balance += netGain;
        
        outcome.win = true;
        outcome.payout = payout;
        outcome.netGain = netGain;
    } else {
        // The user loses this round.
        user.balance -= betAmount;
        outcome.win = false;
        outcome.lost = betAmount;
    }
    
    return outcome;
}

int main() {
    // Seed the random number generator.
    std::random_device rd;
    std::mt19937 rng(rd());
    
    // Initialize the user with the starting balance.
    User user = {STARTING_BALANCE, 0.0};
    
    cout << std::fixed << std::setprecision(2);
    cout << "Welcome to the Betting Game!\n";
    cout << "Your starting balance is: $" << user.balance << "\n\n";
    
    while (true) {
        double betAmount = 0.0;
        double chosenMultiplier = 0.0;
        char playAgain = 'N';
        
        // Prompt for the bet amount.
        cout << "Enter bet amount (enter 0 to exit): ";
        cin >> betAmount;
        if (!cin) {
            cout << "Invalid input. Exiting game.\n";
            break;
        }
        if (betAmount == 0) {
            break;
        }
        if (betAmount > user.balance) {
            cout << "Insufficient balance! Your current balance is $" << user.balance << ". Please try again.\n";
            cin.clear();
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            continue;
        }
        
        // Prompt for the payout multiplier.
        cout << "Enter chosen multiplier (e.g., 1.15, 2.0, etc.): ";
        cin >> chosenMultiplier;
        if (!cin || chosenMultiplier < 1.0) {
            cout << "Invalid multiplier. It must be a number greater than or equal to 1.0. Try again.\n";
            cin.clear();
            cin.ignore(numeric_limits<streamsize>::max(), '\n');
            continue;
        }
        
        // Play one round of the game.
        Outcome result = playRound(user, betAmount, chosenMultiplier, rng);
        
        // Display the round's outcome.
        cout << "\nRound Result:\n";
        if (result.win) {
            cout << "  You WON!\n";
            cout << "  Payout: $" << result.payout << "\n";
            cout << "  Net Gain: $" << result.netGain << "\n";
        } else {
            cout << "  You LOST!\n";
            cout << "  Amount Lost: $" << result.lost << "\n";
        }
        cout << "Win Chance for this round: " << (result.winChance * 100) << "%\n";
        cout << "Total amount bet so far: $" << user.totalBet << "\n";
        cout << "Your current balance: $" << user.balance << "\n\n";
        
        if (user.balance <= 0) {
            cout << "You have run out of money!\n";
            break;
        }
        
        // Ask if the user wants to play another round.
        cout << "Do you want to play another round? (Y/N): ";
        cin >> playAgain;
        cout << "\n";
        if (playAgain != 'Y' && playAgain != 'y') {
            break;
        }
    }
    
    cout << "Thank you for playing! Your final balance is $" << user.balance << "\n";
    return 0;
}
