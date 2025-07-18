class Game {
    static ROWS = 6;
    static COLS = 6;
    static STONE_TYPES = ['💎', '🔴', '🔵', '🟢', '🟡', '🟣'];
    static COLORS = ['#6c5ce7', '#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#a29bfe'];
    static ANIMATION_DURATION = 400;
    static BONUS_MULTIPLIERS = [1, 1.2, 1.5, 2, 3];

    constructor() {
        this.board = Array.from({ length: Game.ROWS }, () =>
            Array.from({ length: Game.COLS }, () => null)
        );
        this.selectedStone = null;
        this.score = 0;
        this.comboCount = 0;
        this.isAnimating = false;
        this.gameBoard = document.getElementById('game-board');
        this.scoreElement = document.querySelector('#score .score-value');
        this.restartButton = document.getElementById('restart');
        this.messageElement = document.getElementById('message');



        this.initEventListeners();
        this.initGame();
    }

    initEventListeners() {
        this.restartButton.addEventListener('click', () => this.initGame());
    }

    initGame() {
        this.board = this.createBoard();
        this.score = 0;
        this.comboCount = 0;
        this.updateScore();
        this.renderBoard();
        this.showMessage('Игра началась! Удачи!', 'success');
    }

    createBoard() {
        let board;
        let attempts = 0;
        const MAX_ATTEMPTS = 100; // Защита от бесконечного цикла

        do {
            board = Array.from({ length: Game.ROWS }, () =>
                Array.from({ length: Game.COLS }, () =>
                    Math.floor(Math.random() * Game.STONE_TYPES.length)
                )
            );
            attempts++;

            if (attempts >= MAX_ATTEMPTS) {
                // Если не удалось создать поле без совпадений после многих попыток,
                // просто возвращаем что есть и позволим игре продолжиться
                console.warn("Не удалось создать поле без начальных совпадений");
                break;
            }
        } while (this.hasInitialMatches(board));

        return board;
    }

    hasInitialMatches(board) {
        // Убрали проверку на null, так как в createBoard() все элементы инициализированы числами
        for (let row = 0; row < Game.ROWS; row++) {
            for (let col = 0; col < Game.COLS - 2; col++) {
                if (board[row][col] === board[row][col + 1] &&
                    board[row][col] === board[row][col + 2]) {
                    return true;
                }
            }
        }

        for (let col = 0; col < Game.COLS; col++) {
            for (let row = 0; row < Game.ROWS - 2; row++) {
                if (board[row][col] === board[row + 1][col] &&
                    board[row][col] === board[row + 2][col]) {
                    return true;
                }
            }
        }

        return false;
    }

    renderBoard() {
        this.gameBoard.innerHTML = '';
        this.board.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                // Проверяем, что value является допустимым индексом
                if (value === null || value === undefined ||
                    value < 0 || value >= Game.COLORS.length) {
                    console.warn(`Недопустимое значение камня в [${rowIndex},${colIndex}]:`, value);
                    value = 0; // Устанавливаем значение по умолчанию
                }

                const stone = document.createElement('div');
                stone.className = 'stone';
                stone.dataset.row = rowIndex;
                stone.dataset.col = colIndex;
                stone.dataset.value = value + 1;
                stone.textContent = Game.STONE_TYPES[value];

                // Добавляем проверку для цвета
                const stoneColor = Game.COLORS[value] || Game.COLORS[0];
                stone.style.background = stoneColor;
                stone.style.color = this.getContrastColor(stoneColor);

                stone.addEventListener('click', () => {
                    if (!this.isAnimating) this.handleStoneClick(rowIndex, colIndex);
                });

                this.gameBoard.appendChild(stone);
            });
        });
    }

    getContrastColor(hexColor) {
        // Добавляем проверку на undefined/null и значение по умолчанию
        if (!hexColor || typeof hexColor !== 'string') {
            return '#2d3436'; // Возвращаем темный цвет по умолчанию
        }

        // Удаляем # если он есть
        const hex = hexColor.replace('#', '');

        // Проверяем правильность формата цвета
        if (hex.length !== 3 && hex.length !== 6) {
            return '#2d3436'; // Возвращаем темный цвет по умолчанию
        }

        // Конвертируем 3-значный HEX в 6-значный
        const fullHex = hex.length === 3
            ? hex.split('').map(c => c + c).join('')
            : hex;

        // Парсим компоненты цвета
        const r = parseInt(fullHex.substr(0, 2), 16);
        const g = parseInt(fullHex.substr(2, 2), 16);
        const b = parseInt(fullHex.substr(4, 2), 16);

        // Рассчитываем яркость
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#2d3436' : '#f5f6fa';
    }

    handleStoneClick(row, col) {
        if (this.selectedStone) {
            const [prevRow, prevCol] = this.selectedStone;

            if (this.areAdjacent(row, col, prevRow, prevCol)) {
                this.isAnimating = true;
                this.swapStones(prevRow, prevCol, row, col);
            }

            this.deselectStone();
            this.selectedStone = null;
        } else {
            this.selectStone(row, col);
            this.selectedStone = [row, col];
        }
    }

    areAdjacent(row1, col1, row2, col2) {
        return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
            (Math.abs(col1 - col2) === 1 && row1 === row2);
    }

    selectStone(row, col) {
        const stone = this.getStoneElement(row, col);
        if (stone) {
            stone.classList.add('selected');
            stone.style.zIndex = '10';
        }
    }

    deselectStone() {
        const selected = document.querySelector('.stone.selected');
        if (selected) {
            selected.classList.remove('selected');
            selected.style.zIndex = '';
        }
    }

    getStoneElement(row, col) {
        return document.querySelector(`.stone[data-row="${row}"][data-col="${col}"]`);
    }

    async swapStones(row1, col1, row2, col2) {
        const stone1 = this.getStoneElement(row1, col1);
        const stone2 = this.getStoneElement(row2, col2);

        if (!stone1 || !stone2) return;

        stone1.classList.add('swapping');
        stone2.classList.add('swapping');

        await this.animateSwap(stone1, stone2);

        [this.board[row1][col1], this.board[row2][col2]] =
            [this.board[row2][col2], this.board[row1][col1]];

        const matches = this.checkMatches();
        if (matches.length > 0) {
            await this.processMatches(matches);
        } else {
            await this.animateSwap(stone1, stone2);
            [this.board[row1][col1], this.board[row2][col2]] =
                [this.board[row2][col2], this.board[row1][col1]];
        }

        stone1.classList.remove('swapping');
        stone2.classList.remove('swapping');
        this.isAnimating = false;
    }

    animateSwap(stone1, stone2) {
        return new Promise(resolve => {
            // Добавляем CSS переменные для расчета направления
            const rect1 = stone1.getBoundingClientRect();
            const rect2 = stone2.getBoundingClientRect();
            const dx = rect2.left - rect1.left;
            const dy = rect2.top - rect1.top;

            stone1.style.setProperty('--tx', `${dx}px`);
            stone1.style.setProperty('--ty', `${dy}px`);
            stone2.style.setProperty('--tx', `${dx}px`);
            stone2.style.setProperty('--ty', `${dy}px`);

            stone1.style.transform = 'translate(var(--tx), var(--ty)) scale(1.1)';
            stone2.style.transform = 'translate(calc(-1 * var(--tx)), calc(-1 * var(--ty))) scale(1.1)';

            setTimeout(() => {
                stone1.style.transform = '';
                stone2.style.transform = '';
                resolve();
            }, Game.ANIMATION_DURATION);
        });
    }

    checkMatches() {
        const matches = new Set();

        // Горизонтальные совпадения
        for (let row = 0; row < Game.ROWS; row++) {
            for (let col = 0; col < Game.COLS - 2; col++) {
                const val = this.board[row][col];
                if (val !== null &&
                    val === this.board[row][col + 1] &&
                    val === this.board[row][col + 2]) {
                    let endCol = col + 2;
                    while (endCol + 1 < Game.COLS && this.board[row][endCol + 1] === val) {
                        endCol++;
                    }
                    for (let c = col; c <= endCol; c++) {
                        matches.add(`${row},${c}`);
                    }
                }
            }
        }

        // Вертикальные совпадения
        for (let col = 0; col < Game.COLS; col++) {
            for (let row = 0; row < Game.ROWS - 2; row++) {
                const val = this.board[row][col];
                if (val !== null &&
                    val === this.board[row + 1][col] &&
                    val === this.board[row + 2][col]) {
                    let endRow = row + 2;
                    while (endRow + 1 < Game.ROWS && this.board[endRow + 1][col] === val) {
                        endRow++;
                    }
                    for (let r = row; r <= endRow; r++) {
                        matches.add(`${r},${col}`);
                    }
                }
            }
        }

        return Array.from(matches).map(pos => {
            const [row, col] = pos.split(',').map(Number);
            return { row, col };
        });
    }

    async processMatches(matches) {
        if (!matches || matches.length === 0) {
            this.isAnimating = false;
            return;
        }


        this.comboCount++;
        const bonusMultiplier = Game.BONUS_MULTIPLIERS[Math.min(this.comboCount - 1, Game.BONUS_MULTIPLIERS.length - 1)];
        const points = Math.floor(matches.length * 10 * bonusMultiplier);
        this.score += points;
        this.updateScore();

        await this.animateDisappear(matches);
        await this.applyGravity();

        const newMatches = this.checkMatches();
        if (newMatches.length > 0) {
            await this.processMatches(newMatches);
        } else {
            this.showMessage(`Комбо x${this.comboCount}! +${points} очков`, 'success');
            this.comboCount = 0;
        }
    }

    async animateDisappear(matches) {
        const promises = matches.map(({ row, col }) => {
            return new Promise(resolve => {
                const stone = this.getStoneElement(row, col);
                if (stone) {
                    stone.classList.add('matched');
                    setTimeout(() => {
                        this.board[row][col] = null;
                        resolve();
                    }, Game.ANIMATION_DURATION / 2);
                } else {
                    resolve();
                }
            });
        });

        await Promise.all(promises);
    }

    async applyGravity() {
        const movements = [];
        const newBoard = Array.from({ length: Game.ROWS }, () => Array(Game.COLS).fill(null));

        for (let col = 0; col < Game.COLS; col++) {
            let emptyRow = Game.ROWS - 1;

            for (let row = Game.ROWS - 1; row >= 0; row--) {
                if (this.board[row][col] !== null) {
                    newBoard[emptyRow][col] = this.board[row][col];
                    if (emptyRow !== row) {
                        movements.push({
                            from: { row, col },
                            to: { row: emptyRow, col }
                        });
                    }
                    emptyRow--;
                }
            }

            // Заполняем оставшиеся ячейки новыми камнями
            for (let row = emptyRow; row >= 0; row--) {
                newBoard[row][col] = Math.floor(Math.random() * Game.STONE_TYPES.length);
                movements.push({
                    from: { row: row - Game.ROWS, col, isNew: true },
                    to: { row, col }
                });
            }
        }

        await this.animateMovements(movements);
        this.board = newBoard;

        // После применения гравитации обязательно обновляем DOM
        this.renderBoard();
    }

    async animateMovements(movements) {
        const promises = movements.map(move => {
            return new Promise(resolve => {
                const { from, to, isNew } = move;
                let stone;

                if (isNew) {
                    // Проверяем допустимость значения
                    const stoneValue = this.board[to.row][to.col];
                    if (stoneValue === null || stoneValue === undefined ||
                        stoneValue < 0 || stoneValue >= Game.STONE_TYPES.length) {
                        resolve();
                        return;
                    }

                    stone = document.createElement('div');
                    stone.className = 'stone falling';
                    stone.dataset.row = to.row;
                    stone.dataset.col = to.col;
                    stone.dataset.value = stoneValue + 1;
                    stone.textContent = Game.STONE_TYPES[stoneValue];

                    const stoneColor = Game.COLORS[stoneValue] || Game.COLORS[0];
                    stone.style.background = stoneColor;
                    stone.style.color = this.getContrastColor(stoneColor);

                    this.gameBoard.appendChild(stone);
                } else {
                    stone = this.getStoneElement(from.row, from.col);
                    if (!stone) {
                        resolve();
                        return;
                    }
                    stone.dataset.row = to.row;
                    stone.dataset.col = to.col;
                }

                setTimeout(() => {
                    if (isNew && stone) {
                        stone.classList.remove('falling');
                    }
                    resolve();
                }, Game.ANIMATION_DURATION);
            });
        });

        await Promise.all(promises);
        this.renderBoard();
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        this.scoreElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.scoreElement.style.transform = '';
        }, 200);
    }

    showMessage(text, type = '') {
        this.messageElement.textContent = text;
        this.messageElement.className = `message ${type}`;
        this.messageElement.classList.add('show');

        setTimeout(() => {
            this.messageElement.classList.remove('show');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => new Game());