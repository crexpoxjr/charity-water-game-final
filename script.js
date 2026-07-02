
const grid = document.querySelector('.game-grid');
const connectionLayer = document.querySelector('.connection-layer');
const statusText = document.getElementById('target-status');
const resetButton = document.getElementById('reset-button');
const newSetButton = document.getElementById('new-set-button');
const scoreDisplay = document.getElementById('score-display');
const totalCells = 81;
let selectedCell = null;
let targetIndex = 0;
let score = 0;
let currentTargets = [];

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

        cell.addEventListener('click', () => {
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

                if (targetIndex === 2) {
                    score += 1;
                    updateScore();
                }

                if (targetIndex < 2) {
                    updateStatus(`Nice! Connect target ${targetIndex + 2}.`);
                } else {
                    updateStatus('All targets connected!');
                }
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

resetButton.addEventListener('click', () => {
    buildBoard(currentTargets);
    score = 0;
    updateScore();
});

newSetButton.addEventListener('click', () => {
    buildBoard(pickRandomTargets(3, totalCells));
});

updateScore();
buildBoard(pickRandomTargets(3, totalCells));
