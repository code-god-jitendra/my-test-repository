// public/script.js

document.addEventListener('DOMContentLoaded', () => {
    // Initial vertical position (in pixels) for the bird.
    let birdPosition = 200; // Start roughly in the middle of the 400px-high game area.
    const gameArea = document.getElementById('gameArea');
    const bird = document.getElementById('bird');
    const balanceSpan = document.getElementById('balance');
    const resultDiv = document.getElementById('result');
    const playButton = document.getElementById('playButton');
    const quitButton = document.getElementById('quitButton');
    const betAmountInput = document.getElementById('betAmount');
    const multiplierInput = document.getElementById('multiplier');
  
    // Set initial bird position.
    bird.style.top = birdPosition + 'px';
  
    // Function to update the displayed balance.
    async function updateBalance() {
      try {
        const res = await fetch('/status');
        const data = await res.json();
        balanceSpan.textContent = data.balance.toFixed(2);
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    }
    updateBalance();
  
    // Play round event handler.
    playButton.addEventListener('click', async () => {
      const betAmount = parseFloat(betAmountInput.value);
      const multiplier = parseFloat(multiplierInput.value);
  
      // Basic input validation.
      if (isNaN(betAmount) || isNaN(multiplier)) {
        resultDiv.textContent = "Please enter valid numbers.";
        return;
      }
      if (betAmount <= 0) {
        resultDiv.textContent = "Bet must be greater than 0.";
        return;
      }
      if (multiplier < 1) {
        resultDiv.textContent = "Multiplier must be at least 1.";
        return;
      }
  
      try {
        // Call the backend /play endpoint.
        const response = await fetch('/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betAmount, chosenMultiplier: multiplier })
        });
        const data = await response.json();
  
        if (data.error) {
          resultDiv.textContent = "Error: " + data.error;
          return;
        }
  
        // Update the result message and move the bird.
        if (data.win) {
          resultDiv.textContent = "🎉 You WON!";
          // Move bird up by 50px.
          birdPosition -= 50;
        } else {
          resultDiv.textContent = "😢 You LOST!";
          // Move bird down by 50px.
          birdPosition += 50;
        }
        
        // Constrain the bird's position between 0 (top) and 350 (bottom).
        if (birdPosition < 0) birdPosition = 0;
        if (birdPosition > 350) birdPosition = 350;
        bird.style.top = birdPosition + 'px';
  
        // Update the balance display.
        updateBalance();
      } catch (error) {
        console.error('Error playing round:', error);
        resultDiv.textContent = "An error occurred.";
      }
    });
  
    // Quit game event handler.
    quitButton.addEventListener('click', () => {
      // Animate a "crash": move bird to bottom and rotate.
      bird.style.transition = "top 1s ease, transform 1s ease";
      bird.style.top = "350px"; // bottom (400px - 50px bird height)
      bird.style.transform = "rotate(90deg)";
      resultDiv.textContent = "Game Over! The bird crashed.";
      // Disable further play.
      playButton.disabled = true;
      quitButton.disabled = true;
    });
  });
  