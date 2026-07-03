
const grid = document.querySelector('.game-grid');
const connectionLayer = document.querySelector('.connection-layer');
const statusText = document.getElementById('target-status');
const resetButton = document.getElementById('reset-button');
const newSetButton = document.getElementById('new-set-button');
const startButton = document.getElementById('start-button');
const scoreDisplay = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display');
const highScoreDisplay = document.getElementById('high-score-display');
const difficultySelect = document.getElementById('difficulty-select');
const totalCells = 81;
const timerDuration = 60;
let selectedCell = null;
let targetIndex = 0;
let score = 0;
let currentTargets = [];
let gameActive = false;
let timeRemaining = timerDuration;
let timerInterval = null;
let audioContext = null;

function ensureAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

const milestonePraises = [
    'Amazing streak!',
    'Unstoppable!',
    'Keep it up!',
    'Incredible run!',
    'You’re on fire!'
];

function playSuccessSound() {
    const ctx = ensureAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.18, ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
}

function playMilestoneSound() {
    const ctx = ensureAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.22, ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);
    oscillator.stop(ctx.currentTime + 0.18);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
}

function getCellCenter(cell) {
    const rect = cell.getBoundingClientRect();
    const containerRect = grid.getBoundingClientRect();

    return {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2
    };
}

function drawConnection(fromCell, toCell) {
    const start = getCellCenter(fromCell);
    const end = getCellCenter(toCell);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    line.setAttribute('x1', start.x);
    line.setAttribute('y1', start.y);
    line.setAttribute('x2', end.x);
    line.setAttribute('y2', end.y);
    line.setAttribute('class', 'connection-line');

    connectionLayer.appendChild(line);
}

function updateStatus(message) {
    statusText.textContent = message;
}

function updateScore() {
    scoreDisplay.textContent = `Score: ${score}`;
}

function getDifficultyKey() {
    return `charityWaterGameHighScore_${difficultySelect.value}`;
}

function loadHighScore() {
    const saved = localStorage.getItem(getDifficultyKey());
    return saved ? Number(saved) : 0;
}

function saveHighScore(value) {
    localStorage.setItem(getDifficultyKey(), String(value));
}

function updateHighScoreDisplay() {
    const highScore = loadHighScore();
    highScoreDisplay.textContent = `High Score: ${highScore}`;
}

function maybeUpdateHighScore() {
    const highScore = loadHighScore();
    if (score > highScore) {
        saveHighScore(score);
        updateHighScoreDisplay();
    }
}

function updateTimerDisplay() {
    timerDisplay.textContent = `Time: ${timeRemaining}s`;
}

function setGameActive(active) {
    gameActive = active;
    startButton.disabled = active;
    difficultySelect.disabled = active;
    document.querySelectorAll('.grid-cell').forEach((cell) => {
        cell.disabled = !active;
    });
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function endGame() {
    stopTimer();
    setGameActive(false);
    updateStatus(`Time's up! Final score: ${score}`);
}

function isStraightConnection(fromCell, toCell) {
    return fromCell.dataset.row === toCell.dataset.row || fromCell.dataset.col === toCell.dataset.col;
}

function pickRandomTargets(count, total) {
    const selected = new Set();

    while (selected.size < count) {
        selected.add(Math.floor(Math.random() * total));
    }

    return Array.from(selected);
}

function buildBoard(targets) {
    document.querySelectorAll('.grid-cell').forEach((cell) => cell.remove());
    connectionLayer.innerHTML = '';

    currentTargets = targets;
    selectedCell = null;
    targetIndex = 0;
    updateStatus('Connect the highlighted targets in order.');

    for (let i = 0; i < totalCells; i += 1) {
        const cell = document.createElement('button');
        cell.className = 'grid-cell';
        cell.type = 'button';
        cell.setAttribute('aria-label', `Grid cell ${i + 1}`);
        cell.dataset.row = Math.floor(i / 9);
        cell.dataset.col = i % 9;

        const targetOrder = targets.indexOf(i) + 1;
        const isTarget = targetOrder > 0;

        if (isTarget) {
            cell.classList.add('target');
            cell.dataset.targetOrder = targetOrder;
            cell.innerHTML = `<span class="cell-number">${targetOrder}</span>`;
        }

        cell.disabled = !gameActive;
        cell.addEventListener('click', () => {
            if (!gameActive) {
                return;
            }
            const targetOrder = Number(cell.dataset.targetOrder || 0);

            if (!selectedCell) {
                if (targetOrder === targetIndex + 1) {
                    selectedCell = cell;
                    cell.classList.add('selected');
                    updateStatus(`Great! Now connect target ${targetIndex + 2}.`);
                } else {
                    updateStatus(`Connect target ${targetIndex + 1} first.`);
                }
                return;
            }

            if (selectedCell === cell) {
                selectedCell.classList.remove('selected');
                selectedCell = null;
                updateStatus(`Connect target ${targetIndex + 1} first.`);
                return;
            }

            if (!isStraightConnection(selectedCell, cell)) {
                updateStatus('Connections must be vertical or horizontal.');
                return;
            }

            if (targetOrder === targetIndex + 2) {
                drawConnection(selectedCell, cell);
                selectedCell.classList.remove('selected');
                selectedCell.classList.add('completed');
                cell.classList.add('completed');
                selectedCell = null;
                targetIndex += 1;

                if (targetIndex === currentTargets.length - 1) {
                    score += 1;
                    updateScore();

                    if (score % 5 === 0) {
                        playMilestoneSound();
                        const praise = milestonePraises[Math.floor(Math.random() * milestonePraises.length)];
                        updateStatus(`${praise} ${score} points reached!`);
                    } else {
                        playSuccessSound();
                        updateStatus('All targets connected! Generating a new target set...');
                    }

                    setTimeout(() => {
                        buildBoard(pickRandomTargets(Number(difficultySelect.value), totalCells));
                    }, 500);
                    return;
                }

                updateStatus(`Nice! Connect target ${targetIndex + 2}.`);
            } else if (targetOrder === 0) {
                drawConnection(selectedCell, cell);
                selectedCell.classList.remove('selected');
                selectedCell.classList.add('path');
                cell.classList.add('selected');
                selectedCell = cell;
                updateStatus(`Keep connecting orthogonally toward target ${targetIndex + 2}.`);
            } else {
                updateStatus(`Connect target ${targetIndex + 1} first.`);
            }
        });

        grid.appendChild(cell);
    }
}

function startGame() {
    if (gameActive) {
        return;
    }

    ensureAudioContext();
    score = 0;
    updateScore();
    timeRemaining = timerDuration;
    updateTimerDisplay();
    buildBoard(pickRandomTargets(Number(difficultySelect.value), totalCells));
    setGameActive(true);
    updateStatus('Connect the highlighted targets in order.');

    timerInterval = setInterval(() => {
        timeRemaining -= 1;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            maybeUpdateHighScore();
            endGame();
        }
    }, 1000);
}

resetButton.addEventListener('click', () => {
    maybeUpdateHighScore();
    stopTimer();
    score = 0;
    timeRemaining = timerDuration;
    updateScore();
    updateTimerDisplay();
    buildBoard(pickRandomTargets(Number(difficultySelect.value), totalCells));
    setGameActive(false);
    updateStatus('Press Start to begin.');
});

newSetButton.addEventListener('click', () => {
    buildBoard(pickRandomTargets(Number(difficultySelect.value), totalCells));
    if (!gameActive) {
        updateStatus('Press Start to begin.');
    }
});

startButton.addEventListener('click', startGame);

difficultySelect.addEventListener('change', () => {
    if (!gameActive) {
        buildBoard(pickRandomTargets(Number(difficultySelect.value), totalCells));
    }
    updateHighScoreDisplay();
});

updateScore();
updateHighScoreDisplay();
updateTimerDisplay();
const initialCount = Number((difficultySelect && difficultySelect.value) || 3);
buildBoard(pickRandomTargets(initialCount, totalCells));
