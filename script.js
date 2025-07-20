function resizeGame() {
    // Получаем реальные размеры окна
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;

    // Обновляем размеры renderer'а
    app.renderer.resize(width, height);

    // Пересчитываем размеры элементов
    const minDimension = Math.min(width, height);
    gemSize = Math.floor(minDimension * 0.08);
    gemPadding = Math.floor(gemSize * 0.15);
    gemRadius = Math.floor(gemSize * 0.2);

    // Пересоздаем доску
    if (boardContainer) {
        createBoard();
    }
}


// Инициализация приложения
const app = new PIXI.Application({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true // Важно для четкого отображения на HiDPI экранах
});
document.getElementById('game-container').appendChild(app.view);


// Ресурсы игры
const resources = {
    gems: {
        sparkle: { color: 0xffcc00, light: 0xffeb3b, icon: '✨' },
        diamond: { color: 0x00e5ff, light: 0x84ffff, icon: '💎' },
        crystal: { color: 0xab47bc, light: 0xce93d8, icon: '🔮' },
        star: { color: 0xff9100, light: 0xffc46b, icon: '🌟' },
        lightning: { color: 0xffea00, light: 0xffff8d, icon: '⚡' },
        heart: { color: 0xff1744, light: 0xff616f, icon: '❤️' },
        moon: { color: 0x7c4dff, light: 0xb388ff, icon: '🌙' },
        comet: { color: 0x00bfa5, light: 0x64ffda, icon: '☄️' }
    }
};

const gemTypes = Object.keys(resources.gems);
const rows = 8, cols = 8;
let gemSize = 70, gemPadding = 10, gemRadius = 15;
const board = Array(rows).fill().map(() => Array(cols).fill(null));
let selectedGem = null, score = 0, combo = 0, comboTimeout = null;
let comboText = null, boardContainer = null;
// Добавьте обработчик ресайза




function createBoard() {
    if (boardContainer && boardContainer.parent) {
        app.stage.removeChild(boardContainer);
    }

    boardContainer = new PIXI.Container();
    const totalWidth = cols * (gemSize + gemPadding) - gemPadding;
    const totalHeight = rows * (gemSize + gemPadding) - gemPadding;

    // Заменяем position.set() на прямое присваивание координат
    boardContainer.x = (app.screen.width - totalWidth) / 2;
    boardContainer.y = (app.screen.height - totalHeight) / 2;

    app.stage.addChild(boardContainer);

    // Остальной код функции остается без изменений
    const boardBg = new PIXI.Graphics();
    boardBg.beginFill(0x16213e, 0.8)
        .lineStyle(4, 0x00ffff, 1)
        .drawRoundedRect(-10, -10, totalWidth + 20, totalHeight + 20, 15)
        .endFill();
    boardContainer.addChild(boardBg);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            board[y][x] = createGemAt(x, y, false);
        }
    }

    if (!comboText) {
        comboText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 36,
            fill: 0xffff00,
            stroke: 0xff6600,
            strokeThickness: 4,
            dropShadow: true
        });
        comboText.anchor.set(0.5);
        comboText.position.set(app.screen.width / 2, 50);
        comboText.alpha = 0;
        app.stage.addChild(comboText);
    }

    removeInitialMatches();
}

function createGemAt(x, y, withAnimation) {
    const gemType = gemTypes[Math.floor(Math.random() * gemTypes.length)];
    const gem = createGem(gemType, x, y);
    const targetX = x * (gemSize + gemPadding) + gemSize / 2;
    const targetY = y * (gemSize + gemPadding) + gemSize / 2;

    if (withAnimation) {
        gem.position.set(targetX, -gemSize);
        gsap.to(gem.position, { y: targetY, duration: 0.5, ease: "bounce.out" });
    } else {
        gem.position.set(targetX, targetY);
    }

    boardContainer.addChild(gem);
    board[y][x] = gem;
    return gem;
}

function dropGems() {
    let needCheckMatches = false;
    const dropAnimations = [];

    for (let x = 0; x < cols; x++) {
        let emptySpaces = 0;

        for (let y = rows - 1; y >= 0; y--) {
            if (!board[y][x]) {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                const gem = board[y][x];
                const newY = y + emptySpaces;
                board[newY][x] = gem;
                gem.data.y = newY;
                board[y][x] = null;

                const targetY = newY * (gemSize + gemPadding) + gemSize / 2;
                dropAnimations.push(
                    gsap.to(gem.position, { y: targetY, duration: 0.3, ease: "power1.out" })
                );
                needCheckMatches = true;
            }
        }

        for (let y = 0; y < emptySpaces; y++) {
            setTimeout(() => createGemAt(x, y, true), y * 100);
            needCheckMatches = true;
        }
    }

    if (needCheckMatches) {
        Promise.all(dropAnimations).then(() => setTimeout(checkMatches, 100));
    }
}

function createGem(type, x, y) {
    const gemData = resources.gems[type];
    const gem = new PIXI.Container();
    gem.interactive = gem.buttonMode = true;
    gem.data = { type, x, y };

    // Тень
    const shadow = new PIXI.Graphics()
        .beginFill(0x000000, 0.2)
        .drawRoundedRect(-gemSize / 2 + 2, -gemSize / 2 + 2, gemSize - 4, gemSize - 4, gemRadius)
        .endFill();

    // Основной цвет камня
    const mainGem = new PIXI.Graphics()
        .beginFill(gemData.color, 0.7)
        .drawRoundedRect(-gemSize / 2, -gemSize / 2, gemSize, gemSize, gemRadius)
        .endFill();

    // Блик
    const highlight = new PIXI.Graphics()
        .beginFill(gemData.light, 0.3)
        .drawEllipse(-gemSize / 4, -gemSize / 4, gemSize / 3, gemSize / 6)
        .endFill();

    // Иконка
    const iconText = new PIXI.Text(gemData.icon, {
        fontSize: gemSize * 0.48,
        fontFamily: 'Arial, Segoe UI Emoji'
    });
    iconText.anchor.set(0.5);

    // Обводка
    const outline = new PIXI.Graphics()
        .lineStyle(2, 0xffffff, 0.6)
        .drawRoundedRect(-gemSize / 2, -gemSize / 2, gemSize, gemSize, gemRadius);

    gem.addChild(shadow, mainGem, highlight, iconText, outline);

    gem.on('pointerdown', () => selectGem(gem))
        .on('pointerover', () => gem !== selectedGem && (gem.scale.set(1.1)))
        .on('pointerout', () => gem !== selectedGem && (gem.scale.set(1)));

    return gem;
}

function selectGem(gem) {
    if (!selectedGem) {
        selectedGem = gem;
        createPulseEffect(gem);
        animateSelectedGem();
    } else if (selectedGem === gem) {
        gsap.to(selectedGem.scale, { x: 1, y: 1, duration: 0.2 });
        selectedGem = null;
    } else if (isAdjacent(selectedGem, gem)) {
        swapGems(selectedGem, gem);
    } else {
        gsap.to(selectedGem.scale, { x: 1, y: 1, duration: 0.2 });
        selectedGem = gem;
        createPulseEffect(gem);
        animateSelectedGem();
    }
}

function animateSelectedGem() {
    if (selectedGem) {
        gsap.to(selectedGem.scale, {
            x: 1.2,
            y: 1.2,
            duration: 0.3,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
    }
}

function createPulseEffect(gem) {
    if (!gem.parent) return;

    const pulse = new PIXI.Graphics()
        .beginFill(0xffffff, 0.5)
        .drawCircle(0, 0, gemSize / 2)
        .endFill();
    pulse.position.copyFrom(gem.position);
    gem.parent.addChild(pulse);

    gsap.to(pulse, {
        width: gemSize * 2,
        height: gemSize * 2,
        alpha: 0,
        duration: 0.5,
        onComplete: () => pulse.parent?.removeChild(pulse)
    });
}

function isAdjacent(gem1, gem2) {
    const dx = Math.abs(gem1.data.x - gem2.data.x);
    const dy = Math.abs(gem1.data.y - gem2.data.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function swapGems(gem1, gem2) {
    gsap.killTweensOf(selectedGem?.scale);
    selectedGem = null;

    [board[gem1.data.y][gem1.data.x], board[gem2.data.y][gem2.data.x]] = [gem2, gem1];
    [gem1.data.x, gem2.data.x] = [gem2.data.x, gem1.data.x];
    [gem1.data.y, gem2.data.y] = [gem2.data.y, gem1.data.y];

    const gem1TargetX = gem1.data.x * (gemSize + gemPadding) + gemSize / 2;
    const gem1TargetY = gem1.data.y * (gemSize + gemPadding) + gemSize / 2;
    const gem2TargetX = gem2.data.x * (gemSize + gemPadding) + gemSize / 2;
    const gem2TargetY = gem2.data.y * (gemSize + gemPadding) + gemSize / 2;

    gsap.to(gem1.position, { x: gem1TargetX, y: gem1TargetY, duration: 0.3 });
    gsap.to(gem2.position, { x: gem2TargetX, y: gem2TargetY, duration: 0.3, onComplete: checkMatches });
}

function checkMatches() {
    const matches = new Set();

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols - 2; x++) {
            const gem1 = board[y][x], gem2 = board[y][x + 1], gem3 = board[y][x + 2];
            if (gem1 && gem2 && gem3 && gem1.data.type === gem2.data.type && gem1.data.type === gem3.data.type) {
                matches.add(gem1).add(gem2).add(gem3);
            }
        }
    }

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows - 2; y++) {
            const gem1 = board[y][x], gem2 = board[y + 1][x], gem3 = board[y + 2][x];
            if (gem1 && gem2 && gem3 && gem1.data.type === gem2.data.type && gem1.data.type === gem3.data.type) {
                matches.add(gem1).add(gem2).add(gem3);
            }
        }
    }

    if (matches.size > 0) destroyGems([...matches]);
    else if (!hasValidMoves()) recreateBoard();
}

function destroyGems(gems) {
    const validGems = gems.filter(gem => gem?.parent);
    if (validGems.length === 0) return dropGems();

    combo++;
    if (combo > 1) {
        comboText.text = `COMBO x${combo}!`;
        gsap.to(comboText, {
            alpha: 1,
            scale: { x: 1.5, y: 1.5 },
            duration: 0.2,
            yoyo: true,
            repeat: 1
        });
        score += 10 * (combo - 1);
    }

    clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => {
        combo = 0;
        gsap.to(comboText, { alpha: 0, duration: 0.5 });
    }, 2000);

    validGems.forEach(gem => {
        const { x, y } = gem.data;
        board[y][x] = null;
        createExplosionEffect(gem);

        gsap.to(gem, {
            scale: 0,
            alpha: 0,
            duration: 0.2,
            onComplete: () => gem.parent?.removeChild(gem)
        });

        score += 10;
    });

    document.getElementById('score').textContent = `Очки: ${score}`;
    setTimeout(dropGems, 300);
}

function createExplosionEffect(gem) {
    if (!gem.parent) return;

    for (let i = 0; i < 15; i++) {
        const particle = new PIXI.Graphics()
            .beginFill(resources.gems[gem.data.type].light)
            .drawCircle(0, 0, 3)
            .endFill();
        particle.position.copyFrom(gem.position);
        gem.parent.addChild(particle);

        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;

        const updateParticle = (delta) => {
            if (!particle.parent) return app.ticker.remove(updateParticle);
            particle.x += Math.cos(angle) * speed * delta;
            particle.y += Math.sin(angle) * speed * delta;
            particle.alpha -= 0.02 * delta;
            if (particle.alpha <= 0) {
                particle.parent?.removeChild(particle);
                app.ticker.remove(updateParticle);
            }
        };

        app.ticker.add(updateParticle);
    }
}

function hasValidMoves() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (x < cols - 1 && checkSwapMatch(x, y, x + 1, y)) return true;
            if (y < rows - 1 && checkSwapMatch(x, y, x, y + 1)) return true;
        }
    }
    return false;
}

function checkSwapMatch(x1, y1, x2, y2) {
    [board[y1][x1], board[y2][x2]] = [board[y2][x2], board[y1][x1]];
    const hasMatch = checkPotentialMatches();
    [board[y1][x1], board[y2][x2]] = [board[y2][x2], board[y1][x1]];
    return hasMatch;
}

function checkPotentialMatches() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols - 2; x++) {
            if (board[y][x] && board[y][x + 1] && board[y][x + 2] &&
                board[y][x].data.type === board[y][x + 1].data.type &&
                board[y][x].data.type === board[y][x + 2].data.type) {
                return true;
            }
        }
    }

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows - 2; y++) {
            if (board[y][x] && board[y + 1][x] && board[y + 2][x] &&
                board[y][x].data.type === board[y + 1][x].data.type &&
                board[y][x].data.type === board[y + 2][x].data.type) {
                return true;
            }
        }
    }

    return false;
}

function removeInitialMatches() {
    let matchesFound;
    do {
        matchesFound = false;
        const matches = new Set();

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols - 2; x++) {
                const gem1 = board[y][x], gem2 = board[y][x + 1], gem3 = board[y][x + 2];
                if (gem1 && gem2 && gem3 && gem1.data.type === gem2.data.type && gem1.data.type === gem3.data.type) {
                    matches.add(gem1).add(gem2).add(gem3);
                    matchesFound = true;
                }
            }
        }

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows - 2; y++) {
                const gem1 = board[y][x], gem2 = board[y + 1][x], gem3 = board[y + 2][x];
                if (gem1 && gem2 && gem3 && gem1.data.type === gem2.data.type && gem1.data.type === gem3.data.type) {
                    matches.add(gem1).add(gem2).add(gem3);
                    matchesFound = true;
                }
            }
        }

        matches.forEach(gem => {
            const { x, y } = gem.data;
            board[y][x] = null;
            if (gem.parent) gem.parent.removeChild(gem);
            const newGem = createGemAt(x, y, false);
            newGem.alpha = 0;
            gsap.to(newGem, { alpha: 1, duration: 0.3 });
        });

    } while (matchesFound);
}

function recreateBoard() {
    const message = new PIXI.Text('Нет возможных ходов!\nСоздаем новое поле', {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0xffffff,
        align: 'center',
        stroke: 0xff0000,
        strokeThickness: 4
    });
    message.anchor.set(0.5).position.set(app.screen.width / 2, app.screen.height / 2);
    app.stage.addChild(message);

    gsap.to(message, {
        alpha: 0,
        duration: 2,
        delay: 1,
        onComplete: () => message.parent?.removeChild(message)
    });

    createBoard();
}

window.addEventListener('resize', () => {
    resizeGame();
});

// Инициализация
resizeGame();
createBoard();


// Обработчик кнопки рестарта
document.getElementById('restart-btn').addEventListener('click', () => {
    // Анимация кнопки
    gsap.to('#restart-btn', {
        rotation: 360,
        duration: 0.5,
        ease: "power2.out"
    });

    // Сброс игры
    score = 0;
    combo = 0;
    document.getElementById('score').textContent = `Очки: 0`;

    // Удаляем текст комбо если есть
    if (comboText) {
        gsap.to(comboText, { alpha: 0, duration: 0.3 });
    }

    // Пересоздаем доску
    createBoard();
});