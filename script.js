// Game state
let gameState = {
  baseCurrency: null,
  targetCurrency: null,
  reverseMode: false,
  timerDuration: 30,
  timeRemaining: 0,
  timerInterval: null,
  currentQuestion: null,
  results: [],
  exchangeRates: null,
  gameStartTime: null,
  gameMode: null,
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initCurrencyDropdowns();
  initEventListeners();
  loadStatistics();
  checkStartButton();
});

let isPrevAnswerWidgetVisible = false;

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  setTheme(theme);
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  document.getElementById("sunIcon").style.display =
    theme === "light" ? "block" : "none";
  document.getElementById("moonIcon").style.display =
    theme === "dark" ? "block" : "none";
}

document.getElementById("themeToggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
});
// Free play button toggle
document.getElementById("freePlayBtn").addEventListener("click", () => {
  const input = document.getElementById("timerInput");
  const btn = document.getElementById("freePlayBtn");
  if (input.disabled) {
    // Re-enable timer
    input.disabled = false;

    input.value = 30;
    btn.style.background = "var(--bg-secondary)";
    btn.style.color = "var(--text-primary)";
    gameState.timerDuration = 30;
    gameState.gameMode = "timed";
  } else {
    // Enable free play
    input.disabled = true;
    input.value = "";
    btn.style.background = "var(--accent)";
    btn.style.color = "white";
    gameState.timerDuration = 0;
    gameState.gameMode = "free";
  }
});

// Input letter and symbol restriction for timer input
const timerInput = document.getElementById("timerInput");

timerInput.addEventListener("input", (e) => {
  // Remove any non-digit characters but keep existing numbers
e.target.value = e.target.value.replace(/\D/g, "");

  // Update game state
  gameState.timerDuration = parseInt(e.target.value) || 0;
});

//Input letter and symbol restriction for answer input
const answerInput = document.getElementById("answerInput");

answerInput.addEventListener("input", (e) => {
  // Allow only digits and at most one decimal point
  e.target.value = e.target.value
    .replace(/[^0-9.]/g, "") // remove all non-digit/non-dot
.replace(/(\..*)\./g, "$1"); // allow only one decimal point
  // Enable/disable submit button
  document.getElementById("submitBtn").disabled = !e.target.value.trim();
});

// Handle Enter key
answerInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !document.getElementById("submitBtn").disabled) {
    submitAnswer();
  }
});

// Currency dropdowns
function initCurrencyDropdowns() {
  const currencies = Object.keys(currencyData);
  populateDropdown("base", currencies);
  populateDropdown("target", currencies);
}

function populateDropdown(type, currencies) {
  const optionsDiv = document.getElementById(`${type}Options`);
  optionsDiv.innerHTML = "";

  // Add popular currencies header
  const popularHeader = document.createElement("div");
  popularHeader.style.cssText =
    "padding: 0.75rem 1rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); background: var(--bg-secondary);";
  popularHeader.textContent = "Popular Currencies";
  optionsDiv.appendChild(popularHeader);

  // Add popular currencies
  popularCurrencies.forEach((code) => {
    if (currencyData[code]) {
      optionsDiv.appendChild(createCurrencyOption(type, code));
    }
  });

  // Add separator
  const separator = document.createElement("div");
  separator.style.cssText =
    "height: 1px; background: var(--border-color); margin: 0.5rem 0;";
  optionsDiv.appendChild(separator);

  // Add all currencies header
  const allHeader = document.createElement("div");
  allHeader.style.cssText =
    "padding: 0.75rem 1rem; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary); background: var(--bg-secondary);";
  allHeader.textContent = "All Currencies";
  optionsDiv.appendChild(allHeader);

  // Add all currencies
  currencies.forEach((code) => {
    if (!popularCurrencies.includes(code)) {
      optionsDiv.appendChild(createCurrencyOption(type, code));
    }
  });
}

function createCurrencyOption(type, code) {
  const data = currencyData[code];
  const option = document.createElement("div");
  option.className = "currency-option";
  option.innerHTML = `
                <span style="font-size: 1.5rem;">${data.flag}</span>
                <div style="flex: 1;">
                    <span style="font-weight: 600;">${code}</span>
                    <span style="color: var(--text-secondary); font-size: 0.875rem; margin-left: 0.5rem;">${data.name}</span>
                </div>
            `;
  option.addEventListener("click", () => selectCurrency(type, code));
  return option;
}

function selectCurrency(type, code) {
  const data = currencyData[code];
  const display = document.getElementById(`${type}Display`);
  display.innerHTML = `
                <span style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.5rem;">${data.flag}</span>
                    <span style="font-weight: 600;">${code}</span>
                    <span style="color: var(--text-secondary); font-size: 0.875rem;">${data.name}</span>
                </span>
            `;

  if (type === "base") {
    gameState.baseCurrency = code;
  } else {
    gameState.targetCurrency = code;
  }

  closeDropdown(type);
  checkStartButton();
  updateRatesDisplay();
}

function closeDropdown(type) {
  document.getElementById(`${type}Dropdown`).classList.remove("active");
}

// Event listeners
function initEventListeners() {
  // Dropdowns
  document.getElementById("baseCurrencyBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown("base");
  });

  document
    .getElementById("targetCurrencyBtn")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown("target");
    });

  // Search
  document.getElementById("baseSearch").addEventListener("input", (e) => {
    filterCurrencies("base", e.target.value);
  });

  document.getElementById("targetSearch").addEventListener("input", (e) => {
    filterCurrencies("target", e.target.value);
  });

  // Prevent search inputs from closing dropdowns
  document.getElementById("baseSearch").addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.getElementById("targetSearch").addEventListener("click", (e) => {
    e.stopPropagation();
  });
  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    closeDropdown("base");
    closeDropdown("target");
  });

  // Game controls
  document.getElementById("reverseMode").addEventListener("change", (e) => {
    gameState.reverseMode = e.target.checked;
    updateRatesDisplay();
  });

  document.getElementById("timerInput").addEventListener("change", (e) => {
    let value = parseInt(e.target.value);

    // Enforce constraints
    if (isNaN(value) || value < 5) value = 5;
    if (value > 300) value = 300;

    // Round to nearest 5
    value = Math.round(value / 5) * 5;

    e.target.value = value;
    gameState.timerDuration = parseInt(e.target.value);
  });

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("stopBtn").addEventListener("click", stopGame);
  document.getElementById("submitBtn").addEventListener("click", submitAnswer);
  document.getElementById("playAgainBtn").addEventListener("click", resetGame);
  document
    .getElementById("showRatesBtn")
    .addEventListener("click", showRatesModal);

  // Answer input
  document.getElementById("answerInput").addEventListener("input", (e) => {
    document.getElementById("submitBtn").disabled = !e.target.value.trim();
  });

  document.getElementById("answerInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !document.getElementById("submitBtn").disabled) {
      submitAnswer();
    }
  });

  // Modals
  document
    .getElementById("statsBtn")
    .addEventListener("click", () => showModal("stats"));
  document
    .getElementById("aboutBtn")
    .addEventListener("click", () => showModal("about"));
  document
    .getElementById("viewStatsBtn")
    .addEventListener("click", () => showModal("stats"));
  document
    .getElementById("closeStatsBtn")
    .addEventListener("click", () => hideModal("stats"));
  document
    .getElementById("closeAboutBtn")
    .addEventListener("click", () => hideModal("about"));
  document
    .getElementById("closeRatesBtn")
    .addEventListener("click", () => hideModal("rates"));
}

function toggleDropdown(type) {
  const dropdown = document.getElementById(`${type}Dropdown`);
  const isActive = dropdown.classList.contains("active");

  closeDropdown("base");
  closeDropdown("target");

  if (!isActive) {
    dropdown.classList.add("active");
  }
}

function filterCurrencies(type, query) {
  const options = document.getElementById(`${type}Options`).children;
  const lowerQuery = query.toLowerCase();

  Array.from(options).forEach((option) => {
    if (option.className === "currency-option") {
      const text = option.textContent.toLowerCase();
      option.style.display = text.includes(lowerQuery) ? "flex" : "none";
    }
  });
}

function checkStartButton() {
  const canStart = gameState.baseCurrency && gameState.targetCurrency;
  document.getElementById("startBtn").disabled = !canStart;
}

async function updateRatesDisplay() {
  if (!gameState.baseCurrency || !gameState.targetCurrency) {
    document.getElementById("ratesDisplay").style.display = "none";
    return;
  }

  try {
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${gameState.baseCurrency}`
    );
    const data = await response.json();
    gameState.exchangeRates = data.rates;

    const rate = data.rates[gameState.targetCurrency];
    const reverseRate = 1 / rate;

    document.getElementById("rateText").textContent = `1 ${
      gameState.baseCurrency
    } = ${rate.toFixed(4)} ${gameState.targetCurrency}`;

    // Show reverse rate if reverse mode is enabled
    if (gameState.reverseMode) {
      document.getElementById("reverseRateText").textContent = `1 ${
        gameState.targetCurrency
      } = ${reverseRate.toFixed(4)} ${gameState.baseCurrency}`;
      document.getElementById("reverseRateText").style.display = "block";
    } else {
      document.getElementById("reverseRateText").style.display = "none";
    }

    document.getElementById("ratesDisplay").style.display = "block";
  } catch (error) {
    console.error("Failed to fetch rates:", error);
  }
}

function showRatesModal() {
  const content = document.getElementById("ratesModalContent");
  const baseData = currencyData[gameState.baseCurrency];
  const targetData = currencyData[gameState.targetCurrency];

  if (gameState.exchangeRates) {
    const rate = gameState.exchangeRates[gameState.targetCurrency];
    const reverseRate = 1 / rate;

    content.innerHTML = `
                    <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                        <div class="flex items-center justify-between mb-2">
                            <span style="font-size: 1.5rem;">${baseData.flag} ${
      gameState.baseCurrency
    }</span>
                            <span style="font-weight: 600;">→</span>
                            <span style="font-size: 1.5rem;">${
                              targetData.flag
                            } ${gameState.targetCurrency}</span>
                        </div>
                        <p class="text-center text-2xl font-bold">1 = ${rate.toFixed(
                          4
                        )}</p>
                    </div>
                    ${
                      gameState.reverseMode
                        ? `
                    <div class="p-4 rounded-lg" style="background: var(--bg-secondary);">
                        <div class="flex items-center justify-between mb-2">
                            <span style="font-size: 1.5rem;">${
                              targetData.flag
                            } ${gameState.targetCurrency}</span>
                            <span style="font-weight: 600;">→</span>
                            <span style="font-size: 1.5rem;">${baseData.flag} ${
                            gameState.baseCurrency
                          }</span>
                        </div>
                        <p class="text-center text-2xl font-bold">1 = ${reverseRate.toFixed(
                          4
                        )}</p>
                    </div>
                    `
                        : ""
                    }
                `;
  }

  showModal("rates");
}

// Game logic
function startGame() {
  gameState.results = [];
  gameState.timerDuration = parseInt(
    document.getElementById("timerInput").value
  );
  gameState.timeRemaining = gameState.timerDuration;
  gameState.gameStartTime = Date.now();

  document.getElementById("setupView").style.display = "none";
  document.getElementById("gameView").style.display = "block";
  document.getElementById("resultsView").style.display = "none";
  document.getElementById("questionCount").textContent = "0";

  // Hide or show timer based on free play mode
  if (gameState.gameMode === "free") {
    document.getElementById("timerContainer").style.display = "none";
  } else {
    document.getElementById("timerContainer").style.display = "block";
    startTimer();
  }

  generateQuestion();
}

function startTimer() {
  updateTimerDisplay();

  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining -= 1;
    updateTimerDisplay();

    if (gameState.timeRemaining <= 0) {
      endGame();
    }
  }, 1000);
}

function updatePreviousAnswerWidget() {
  const widget = document.getElementById("previousAnswerWidget");
  
  // Show widget only if results exist and the toggle is ON
  if (gameState.results.length === 0 || !isPrevAnswerWidgetVisible) {
    widget.style.display = 'none';
    return;
  }
  
  widget.style.display = 'block';
  
  // Get the last submitted result
  const lastResult = gameState.results[gameState.results.length - 1];
  
  // 1. Determine Color and Translucent Background Color
  let accuracyColor;
  let backgroundColor;

if (lastResult.accuracy >= 95) {
    accuracyColor = 'green';
    backgroundColor = 'rgba(0, 128, 0, 0.2)'; 
  } else if (lastResult.accuracy >= 85) {
    accuracyColor = 'orange';
    backgroundColor = 'rgba(255, 165, 0, 0.2)';
  } else {
    accuracyColor = 'red';
    backgroundColor = 'rgba(255, 0, 0, 0.2)';
  }

widget.style.backgroundColor = backgroundColor;

  document.getElementById("prevAnswerPrompt").textContent = lastResult.question;
  document.getElementById("prevAnswerUser").textContent = lastResult.userAnswer.toFixed(2);
  document.getElementById("prevAnswerCorrect").textContent = lastResult.correctAnswer.toFixed(2);
  document.getElementById("prevAnswerAccuracy").innerHTML = `<span style="font-weight: bold; color: ${accuracyColor}">${lastResult.accuracy.toFixed(1)}%</span>`;
}

function togglePreviousAnswerWidget() {
  // Toggle the global state
  isPrevAnswerWidgetVisible = !isPrevAnswerWidgetVisible;
  
  // Immediately update the widget display
  updatePreviousAnswerWidget();
}

function updateTimerDisplay() {
  document.getElementById("timerDisplay").textContent = gameState.timeRemaining;
}

/**
 * 1. Generates two independent, standard normally distributed random numbers
 * using the Box-Muller transform. We only need one for the Log-Normal function.
 */
function boxMullerTransform() {
  let u1 = Math.random();
  let u2 = Math.random();

  // Calculate z0, the standard normally distributed random number (mean=0, stdev=1)
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  // We can return z0, or an object/array of both z0 and z1 if needed.
  return z0;
}

/**
 * 2. Generates a USD equivalent value between $0.50 and $500
 * using a Log-Normal distribution, heavily favoring smaller values.
 */
function logNormalUSDAmount() {
  const minAmount = 0.5;
  const maxAmount = 500.0;

  // Parameters from the SwiftUI example
  const meanLog = 2.0; // ln(Median ≈ 7.4)
  const sigma = 1.0;

  // Generate standard normal sample (z)
  const standardNormalSample = boxMullerTransform();

  // Scale and shift z to get a normally distributed value X ~ N(meanLog, sigma^2)
  const normalSample = standardNormalSample * sigma + meanLog;

  // Apply the Log-Normal transformation: Y = e^X
  let amount = Math.exp(normalSample);

  // Clamp to desired range: min(maxAmount, max(minAmount, amount))
  return Math.min(maxAmount, Math.max(minAmount, amount));
}

/**
 * 3. Rounds the number to a "sensible" amount based on its magnitude,
 * based on the rounding logic provided in the SwiftUI example.
 */
function roundToSensibleNumber(number) {
  if (number < 1.0) {
    return Math.round(number * 100) / 100.0; // Nearest cent
  } else if (number <= 20.0) {
    return Math.round(number * 10) / 10.0; // Nearest 10 cents
  } else if (number < 100.0) {
    return Math.round(number); // Nearest whole number
  } else if (number < 1000.0) {
    return Math.round(number / 10.0) * 10.0; // Nearest 10 units
  } else if (number < 10000.0) {
    return Math.round(number / 100.0) * 100.0; // Nearest 100 units
  } else {
    return Math.round(number / 1000.0) * 1000.0; // Nearest 1000 units
  }
}

async function generateQuestion() {
  let fromCurrency = gameState.baseCurrency;
  let toCurrency = gameState.targetCurrency;

  // Reverse mode logic
  if (gameState.reverseMode && Math.random() < 0.5) {
    [fromCurrency, toCurrency] = [toCurrency, fromCurrency];
  }

  try {
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${fromCurrency}`
    );
    const data = await response.json();
    const rate = data.rates[toCurrency];
    const baseToUsdRate = data.rates["USD"]; // X BaseCurrency = 1 USD

    // --- NEW LOGIC START ---

    // 1. Generate the Log-Normal USD equivalent value
    const usdEquivalentAmount = logNormalUSDAmount();

    // 2. Convert the USD equivalent to the 'fromCurrency' amount.
    // baseToUsdRate is (USD per 1 FROM_CURRENCY).
    // Amount in FROM_CURRENCY = USD_EQUIVALENT / baseToUsdRate
    const finalPromptAmount = usdEquivalentAmount / baseToUsdRate;

    // 3. Apply sensible rounding to the 'fromCurrency' amount
    const amount = roundToSensibleNumber(finalPromptAmount);

    // --- NEW LOGIC END ---

    const correctAnswer = (amount * rate).toFixed(2);

    gameState.currentQuestion = {
      fromCurrency,
      toCurrency,
      amount,
      correctAnswer: parseFloat(correctAnswer),
    };

    const fromData = currencyData[fromCurrency];
    const toData = currencyData[toCurrency];

    document.getElementById(
      "questionText"
    ).innerHTML = `<span style="font-size: 1.5rem;">${
      fromData.flag
    }</span> ${amount.toLocaleString()} ${fromCurrency} = ? <span style="font-size: 1.5rem;">${
      toData.flag
    }</span> ${toCurrency}`;
    document.getElementById("answerInput").value = "";
    document.getElementById("answerInput").focus();
    document.getElementById("submitBtn").disabled = true;
  } catch (error) {
    console.error("Failed to generate question:", error);
  }
}

function submitAnswer() {
  const userAnswer = parseFloat(document.getElementById("answerInput").value);
  const correct = gameState.currentQuestion.correctAnswer;
  const accuracy = Math.max(
    0,
    100 - (Math.abs(userAnswer - correct) / correct) * 100
  );

  gameState.results.push({
    question: document.getElementById("questionText").textContent,
    userAnswer,
    correctAnswer: correct,
    accuracy,
  });

  document.getElementById("questionCount").textContent =
    gameState.results.length;
  generateQuestion();

  updatePreviousAnswerWidget();
}

function stopGame() {
  endGame(true);
}

function endGame(early = false) {
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }

  document.getElementById("gameView").style.display = "none";
  document.getElementById("resultsView").style.display = "block";

  displayResults(early);
  saveGameToHistory();
}

function displayResults(early) {
  const results = gameState.results;

  if (results.length === 0) {
    document.getElementById("resultsView").innerHTML = `
                    <div class="card text-center">
                        <h2 class="text-2xl font-bold mb-4">No Questions Answered</h2>
                        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">You didn't answer any questions. Try again!</p>
                        <button class="btn btn-primary" onclick="resetGame()">Play Again</button>
                    </div>
                `;
    return;
  }

  const totalQuestions = results.length;
  const avgAccuracy =
    results.reduce((sum, r) => sum + r.accuracy, 0) / totalQuestions;

  // Calculate time used
  let timeUsed;
  if (gameState.timerDuration === 0) {
    // Free play mode - calculate actual time elapsed
    timeUsed = Math.round((Date.now() - gameState.gameStartTime) / 1000);
  } else {
    // Timed mode
    timeUsed = gameState.timerDuration - (early ? gameState.timeRemaining : 0);
  }

  // Summary stats
  document.getElementById("finalAccuracy").textContent =
    avgAccuracy.toFixed(1) + "%";
  document.getElementById("finalQuestions").textContent = totalQuestions;
  if (gameState.gameMode === "free") {
    document.getElementById("finalTime").textContent = "Free Play";
  } else {
    document.getElementById("finalTime").textContent = timeUsed + "s";
  }
  document.getElementById("finalRank").textContent = getRankBadge(avgAccuracy);

  // Results table
  const tbody = document.getElementById("resultsBody");
  tbody.innerHTML = "";

  results.forEach((result, i) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid var(--border-color)";

    const badgeClass = getBadgeClass(result.accuracy);

    row.innerHTML = `
                    <td class="p-3">${i + 1}</td>
                    <td class="p-3">${result.question}</td>
                    <td class="p-3 text-right">${result.userAnswer.toFixed(
                      2
                    )}</td>
                    <td class="p-3 text-right">${result.correctAnswer.toFixed(
                      2
                    )}</td>
                    <td class="p-3 text-center">
                        <span class="stat-badge ${badgeClass}">${result.accuracy.toFixed(
      1
    )}%</span>
                    </td>
                `;

    tbody.appendChild(row);
  });

  // Chart
  displayResultsChart(results);
}

function displayResultsChart(results) {
  const ctx = document.getElementById("resultsChart");

  // Destroy existing chart if any
  if (window.resultsChartInstance) {
    window.resultsChartInstance.destroy();
  }

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "#334155" : "#e2e8f0";

  window.resultsChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: results.map((_, i) => `Q${i + 1}`),
      datasets: [
        {
          label: "Accuracy %",
          data: results.map((r) => r.accuracy),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: textColor,
            callback: function (value) {
              return value + "%";
            },
          },
          grid: {
            color: gridColor,
          },
        },
        x: {
          ticks: {
            color: textColor,
          },
          grid: {
            color: gridColor,
          },
        },
      },
    },
  });
}

function getBadgeClass(accuracy) {
  if (accuracy >= 98) return "badge-diamond";
  if (accuracy >= 95) return "badge-platinum";
  if (accuracy >= 90) return "badge-gold";
  if (accuracy >= 80) return "badge-silver";
  return "badge-bronze";
}

function getRankBadge(accuracy) {
  if (accuracy >= 98) return "💎 Diamond";
  if (accuracy >= 95) return "🏆 Platinum";
  if (accuracy >= 90) return "🥇 Gold";
  if (accuracy >= 80) return "🥈 Silver";
  return "🥉 Bronze";
}

function resetGame() {
  document.getElementById("setupView").style.display = "block";
  document.getElementById("gameView").style.display = "none";
  document.getElementById("resultsView").style.display = "none";
}

// Statistics & Storage
function saveGameToHistory() {
  if (gameState.results.length === 0) return;

  const history = JSON.parse(localStorage.getItem("gameHistory") || "[]");

  const avgAccuracy =
    gameState.results.reduce((sum, r) => sum + r.accuracy, 0) /
    gameState.results.length;

  let timeUsed;
  if (gameState.timerDuration === 0) {
    timeUsed = Math.round((Date.now() - gameState.gameStartTime) / 1000);
  } else {
    timeUsed = gameState.timerDuration - gameState.timeRemaining;
  }

  const gameRecord = {
    date: new Date().toISOString(),
    baseCurrency: gameState.baseCurrency,
    targetCurrency: gameState.targetCurrency,
    questionsAnswered: gameState.results.length,
    accuracy: avgAccuracy,
    duration: timeUsed,
    isFreePlay: gameState.timerDuration === 0,
    reverseMode: gameState.reverseMode || false,
    results: gameState.results,
  };

  history.push(gameRecord);

  // Keep only last 50 games
  if (history.length > 50) {
    history.shift();
  }

  localStorage.setItem("gameHistory", JSON.stringify(history));
}

function loadStatistics() {
  const history = JSON.parse(localStorage.getItem("gameHistory") || "[]");

  if (history.length === 0) {
    return;
  }

  displayStatistics(history);
}

function displayStatistics(history) {
  const content = document.getElementById("statsContent");

  if (history.length === 0) {
    content.innerHTML =
      '<p class="text-center" style="color: var(--text-secondary);">No games played yet. Start playing to see your statistics!</p>';
    return;
  }

  const totalGames = history.length;
  const avgAccuracy =
    history.reduce((sum, g) => sum + (g.accuracy || 0), 0) / totalGames;
  const totalQuestions = history.reduce(
    (sum, g) => sum + g.questionsAnswered,
    0
  );
  const bestGame = history.reduce((best, g) =>
    (g.accuracy || 0) > (best.accuracy || 0) ? g : best
  );

  const recentGames = history.slice(-10);

  // Build the HTML
  content.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="text-center p-4 rounded-lg" style="background: var(--bg-secondary);">
        <p class="text-2xl font-bold">${totalGames}</p>
        <p class="text-sm" style="color: var(--text-secondary);">Games Played</p>
      </div>
      <div class="text-center p-4 rounded-lg" style="background: var(--bg-secondary);">
        <p class="text-2xl font-bold">${avgAccuracy.toFixed(1)}%</p>
        <p class="text-sm" style="color: var(--text-secondary);">Avg Accuracy</p>
      </div>
      <div class="text-center p-4 rounded-lg" style="background: var(--bg-secondary);">
        <p class="text-2xl font-bold">${totalQuestions}</p>
        <p class="text-sm" style="color: var(--text-secondary);">Total Questions</p>
      </div>
      <div class="text-center p-4 rounded-lg" style="background: var(--bg-secondary);">
        <p class="text-2xl font-bold">${bestGame.accuracy.toFixed(1)}%</p>
        <p class="text-sm" style="color: var(--text-secondary);">Best Score</p>
      </div>
    </div>
    
    <div class="mb-6">
      <h3 class="font-semibold mb-3">Recent Performance (Last 10 Games)</h3>
      <canvas id="statsChart"></canvas>
    </div>
    
    <div>
      <h3 class="font-semibold mb-3">Recent Games</h3>
      <div class="space-y-2" style="max-height: 300px; overflow-y: auto;">
        ${recentGames
          .slice()
          .reverse()
          .map((game, index) => {
            const date = new Date(game.date).toLocaleDateString();
            const time = new Date(game.date).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const baseData = currencyData[game.baseCurrency] || { flag: "" };
            const targetData = currencyData[game.targetCurrency] || { flag: "" };
            return `
              <div 
                class="p-3 rounded-lg cursor-pointer hover:bg-slate-300 recent-game" 
                style="background: var(--bg-secondary);"
                data-index="${history.length - 1 - index}"
              >
                <div class="flex justify-between items-center">
                  <div>
                    <span style="font-size: 1.2rem;">${baseData.flag}</span>
                    <span class="font-semibold">${game.baseCurrency} ${
                      game.reverseMode ? "↔️" : "➡️"
                    } ${game.targetCurrency}</span>
                    <span style="font-size: 1.2rem;">${targetData.flag}</span>
                    <span class="text-sm ml-2" style="color: var(--text-secondary);">${date} ${time}</span>
                    ${
                      game.isFreePlay
                        ? '<span class="text-sm ml-2" style="color: var(--accent);">Free Play</span>'
                        : ""
                    }
                  </div>
                  <div class="text-right">
                    <span class="stat-badge ${getBadgeClass(game.accuracy || 0)}">${(
              game.accuracy || 0
            ).toFixed(1)}%</span>
                    <span class="text-sm block" style="color: var(--text-secondary);">${game.questionsAnswered} questions</span>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
    
    <div class="mt-6 text-center">
      <button class="btn btn-secondary" onclick="clearHistory()">Clear All History</button>
    </div>
  `;

  // Attach click handlers safely
  document.querySelectorAll(".recent-game").forEach((el) => {
    el.addEventListener("click", () => {
      const index = el.dataset.index;
      const game = history[index];
      showGameDetails(game);
    });
  });

  // Draw stats chart
  setTimeout(() => {
    const ctx = document.getElementById("statsChart");
    if (!ctx) return;

    if (window.statsChartInstance) {
      window.statsChartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "#334155" : "#e2e8f0";

    window.statsChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: recentGames.map((_, i) => `Game ${i + 1}`),
        datasets: [
          {
            label: "Accuracy %",
            data: recentGames.map((g) => g.accuracy),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: textColor,
              callback: (value) => value + "%",
            },
            grid: { color: gridColor },
          },
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
        },
      },
    });
  }, 100);
}

function formatGameDate(isoDate) {
  const date = new Date(isoDate);

  const formattedDate = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${formattedDate} ${formattedTime}`;
}

// Show full results for a specific game
function showGameDetails(game) {
  // Hide stats modal
  hideModal("stats");

  // Set up resultsView
  document.getElementById("resultsView").style.display = "block";
  document.getElementById("gameView").style.display = "none";
  document.getElementById("setupView").style.display = "none";
  // Populate summary stats
  const avgAccuracy = game.accuracy;
  const totalQuestions = game.questionsAnswered;
  document.getElementById("resultsTitle").textContent =
    "Game Results - " + formatGameDate(game.date);
  document.getElementById("finalAccuracy").textContent =
    avgAccuracy.toFixed(1) + "%";
  document.getElementById("finalQuestions").textContent = totalQuestions;
  document.getElementById("finalTime").textContent = game.isFreePlay
    ? "Free Play"
    : game.duration + "s";
  document.getElementById("finalRank").textContent = getRankBadge(avgAccuracy);

  // Populate results table
  const tbody = document.getElementById("resultsBody");
  tbody.innerHTML = "";
  game.results.forEach((result, i) => {
    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid var(--border-color)";
    const badgeClass = getBadgeClass(result.accuracy);
    row.innerHTML = `
      <td class="p-3">${i + 1}</td>
      <td class="p-3">${result.question}</td>
      <td class="p-3 text-right">${result.userAnswer.toFixed(2)}</td>
      <td class="p-3 text-right">${result.correctAnswer.toFixed(2)}</td>
      <td class="p-3 text-center">
        <span class="stat-badge ${badgeClass}">${result.accuracy.toFixed(
      1
    )}%</span>
      </td>
    `;
    tbody.appendChild(row);
  });

  displayResultsChart(game.results);
}

function clearHistory() {
  if (
    confirm(
      "Are you sure you want to clear all game history? This cannot be undone."
    )
  ) {
    localStorage.removeItem("gameHistory");
    hideModal("stats");
    document.getElementById("statsContent").innerHTML =
      '<p class="text-center" style="color: var(--text-secondary);">No games played yet. Start playing to see your statistics!</p>';
  }
}

// Modal management
function showModal(type) {
  if (type === "stats") {
    const history = JSON.parse(localStorage.getItem("gameHistory") || "[]");
    displayStatistics(history);
  }
  document.getElementById(`${type}Modal`).classList.add("active");
}

function hideModal(type) {
  document.getElementById(`${type}Modal`).classList.remove("active");
}

// Close modals on outside click
document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("active");
    }
  });
});
