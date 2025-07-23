// 時影雙行遊戲 - 簡化版本
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        this.init();
    }

    init() {
        this.player = new Player();
        this.echoes = [];
        this.currentLevel = 1;
        this.gameState = {
            round: 1,
            level: 1,
            gameStartTime: Date.now(),
            roundStartTime: Date.now(),
            isRoundActive: true,
            goalReached: false,
            levelStats: {}
        };
        
        this.initAudio();
        this.setupEventListeners();
        this.resizeCanvas();
        this.gameLoop(0);
    }

    initAudio() {
        this.audio = {
            bgm: new Audio('assets/bgm.mp3'),
            switch: new Audio('assets/switch.mp3'),
            jump: new Audio('assets/jump.mp3'),
            shift: new Audio('assets/shift.mp3'),
            tada: new Audio('assets/tada.mp3'),
            final: new Audio('assets/final.mp3')
        };
        this.audio.bgm.loop = true;
        this.audio.bgm.volume = 0.5;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        switch(e.key.toLowerCase()) {
            case 'a':
            case 'arrowleft':
                this.player.keys.left = true;
                break;
            case 'd':
            case 'arrowright':
                this.player.keys.right = true;
                break;
            case 'w':
            case 'arrowup':
                if (!this.player.keys.up) {
                    this.player.keys.up = true;
                    this.player.jump();
                }
                break;
            case 'p':
                e.preventDefault();
                this.startNewRound();
                break;
            case 'r':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.resetGame();
                }
                break;
            case '1': case '2': case '3': case '4': case '5':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.jumpToLevel(parseInt(e.key));
                }
                break;
        }
    }

    handleKeyUp(e) {
        switch(e.key.toLowerCase()) {
            case 'a':
            case 'arrowleft':
                this.player.keys.left = false;
                break;
            case 'd':
            case 'arrowright':
                this.player.keys.right = false;
                break;
            case 'w':
            case 'arrowup':
                this.player.keys.up = false;
                break;
        }
    }

    gameLoop(currentTime) {
        // 60fps限制
        if (currentTime - this.lastTime >= this.frameInterval) {
            this.update();
            this.draw();
            this.updateUI();
            this.lastTime = currentTime;
        }
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update() {
        if (!this.gameState.isRoundActive) return;
        
        this.player.update();
        this.updateEchoes();
        this.updateLevel();
        this.checkCollisions();
        this.checkWinCondition();
    }

    updateEchoes() {
        const currentTime = Date.now() - this.gameState.roundStartTime;
        this.echoes.forEach(echo => echo.update(currentTime));
    }

    updateLevel() {
        const level = this.getCurrentLevel();
        if (level.movingPlatforms) {
            level.movingPlatforms.forEach(platform => platform.update());
        }
        if (level.enemies) {
            level.enemies.forEach(enemy => enemy.update(this.player));
        }
    }

    checkCollisions() {
        this.player.checkCollisions(this.getCurrentLevel());
        this.checkSwitchActivation();
        this.checkEnemyCollisions();
    }

    checkWinCondition() {
        const level = this.getCurrentLevel();
        if (this.isColliding(this.player, level.goal) && this.allSwitchesActivated()) {
            this.gameState.goalReached = true;
            this.gameState.isRoundActive = false;
            this.showGoalMessage();
        }
    }

    // 簡化的關卡數據
    getCurrentLevel() {
        return LEVELS[this.currentLevel] || LEVELS[1];
    }

    // 其他方法簡化版本...
    startNewRound() {
        if (this.player.recording.length > 10) {
            this.echoes.push(new Echo(this.player.recording, this.echoes.length));
            if (this.echoes.length > 5) this.echoes.shift();
        }
        
        this.player.reset();
        this.gameState.round++;
        this.gameState.roundStartTime = Date.now();
        this.gameState.isRoundActive = true;
        this.resetSwitches();
    }

    resetGame() {
        this.echoes = [];
        this.player.reset();
        this.gameState.round = 1;
        this.gameState.roundStartTime = Date.now();
        this.gameState.isRoundActive = true;
        this.resetSwitches();
        this.clearMessages();
    }

    // 繪製方法
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const level = this.getCurrentLevel();
        this.drawLevel(level);
        this.drawEntities();
    }

    drawLevel(level) {
        // 繪製平台、機關、目標等
        level.platforms.forEach(platform => this.drawRect(platform));
        level.switches.forEach(sw => this.drawSwitch(sw));
        this.drawGoal(level.goal);
    }

    drawEntities() {
        this.echoes.forEach(echo => echo.draw(this.ctx));
        this.player.draw(this.ctx);
    }

    drawRect(obj) {
        this.ctx.fillStyle = obj.color;
        this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    }

    drawSwitch(sw) {
        this.ctx.fillStyle = sw.activated ? '#2ecc71' : sw.color;
        this.ctx.fillRect(sw.x, sw.y, sw.width, sw.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(sw.activated ? '✓' : '⚡', sw.x + sw.width/2, sw.y + sw.height/2);
    }

    drawGoal(goal) {
        const allActivated = this.allSwitchesActivated();
        this.ctx.fillStyle = allActivated ? goal.color : '#95a5a6';
        this.ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(allActivated ? '🎯' : '🔒', goal.x + goal.width/2, goal.y + goal.height/2 + 7);
    }

    resizeCanvas() {
        const BASE_WIDTH = 1200;
        const BASE_HEIGHT = 600;
        
        const availableWidth = window.innerWidth;
        const availableHeight = window.innerHeight - 60;
        
        const scale = Math.min(
            availableWidth / BASE_WIDTH,
            availableHeight / BASE_HEIGHT
        );
        
        this.canvas.width = BASE_WIDTH;
        this.canvas.height = BASE_HEIGHT;
        this.canvas.style.width = `${BASE_WIDTH * scale}px`;
        this.canvas.style.height = `${BASE_HEIGHT * scale}px`;
        this.canvas.style.left = `${(availableWidth - BASE_WIDTH * scale) / 2}px`;
        
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    updateUI() {
        document.getElementById('round').textContent = this.gameState.round;
        document.getElementById('echoCount').textContent = this.echoes.length;
        document.getElementById('totalTimer').textContent = Math.floor((Date.now() - this.gameState.gameStartTime) / 1000);
        document.getElementById('level').textContent = this.gameState.level;
    }

    // 輔助方法
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    allSwitchesActivated() {
        return this.getCurrentLevel().switches.every(sw => sw.activated);
    }

    checkSwitchActivation() {
        const level = this.getCurrentLevel();
        level.switches.forEach(sw => {
            let activated = false;
            if (this.isColliding(this.player, sw)) activated = true;
            this.echoes.forEach(echo => {
                if (this.isColliding(echo, sw)) activated = true;
            });
            if (activated && !sw.activated) this.audio.switch.play();
            sw.activated = activated;
        });
    }

    checkEnemyCollisions() {
        const level = this.getCurrentLevel();
        if (!level.enemies) return;
        
        level.enemies.forEach(enemy => {
            if (this.isColliding(this.player, enemy) && !this.player.isInvulnerable) {
                this.player.takeDamage();
            }
        });
    }

    resetSwitches() {
        this.getCurrentLevel().switches.forEach(sw => sw.activated = false);
    }

    clearMessages() {
        document.querySelectorAll('.goal-reached, .round-info, .game-complete').forEach(el => el.remove());
    }

    showGoalMessage() {
        this.audio.tada.play();
        const goalMsg = document.createElement('div');
        goalMsg.className = 'goal-reached';
        
        if (this.currentLevel === 5) {
            this.showGameComplete();
            return;
        }

        goalMsg.innerHTML = `
            🎉 關卡 ${this.currentLevel} 完成！<br>
            用了 ${this.gameState.round} 回合<br>
            <small>進入下一關</small>
        `;
        document.getElementById('gameContainer').appendChild(goalMsg);
        
        setTimeout(() => {
            this.nextLevel();
        }, 500);
    }

    showGameComplete() {
        // 遊戲完成邏輯
        console.log('遊戲完成！');
    }

    nextLevel() {
        if (LEVELS[this.currentLevel + 1]) {
            this.currentLevel++;
            this.gameState.level = this.currentLevel;
            this.resetGame();
        }
    }

    jumpToLevel(level) {
        if (level >= 1 && level <= 5) {
            this.currentLevel = level;
            this.gameState.level = level;
            this.resetGame();
        }
    }
}

// 玩家類別
class Player {
    constructor() {
        this.x = 50;
        this.y = 400;
        this.width = 30;
        this.height = 30;
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpPower = 15;
        this.onGround = false;
        this.color = '#e74c3c';
        this.recording = [];
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.keys = { left: false, right: false, up: false };
    }

    update() {
        this.recordState();
        this.handleMovement();
        this.applyGravity();
        this.updatePosition();
        this.updateInvulnerability();
    }

    recordState() {
        const currentTime = Date.now() - game.gameState.roundStartTime;
        this.recording.push({
            time: currentTime,
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy
        });
    }

    handleMovement() {
        if (this.keys.left) {
            this.vx = -this.speed;
        } else if (this.keys.right) {
            this.vx = this.speed;
        } else {
            this.vx *= 0.8;
        }
    }

    jump() {
        if (this.onGround) {
            this.vy = -this.jumpPower;
            this.onGround = false;
            game.audio.jump.play();
        }
    }

    applyGravity() {
        this.vy += 0.8;
    }

    updatePosition() {
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > game.canvas.width) this.x = game.canvas.width - this.width;
        
        if (this.y > game.canvas.height) this.reset();
    }

    checkCollisions(level) {
        this.onGround = false;
        level.platforms.forEach(platform => {
            if (game.isColliding(this, platform)) {
                if (this.vy > 0 && this.y < platform.y) {
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                }
            }
        });
    }

    takeDamage() {
        this.isInvulnerable = true;
        this.invulnerableTimer = Date.now();
        this.reset();
    }

    updateInvulnerability() {
        if (this.isInvulnerable) {
            if (Date.now() - this.invulnerableTimer > 2000) {
                this.isInvulnerable = false;
            }
        }
    }

    reset() {
        this.x = 50;
        this.y = 400;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.recording = [];
    }

    draw(ctx) {
        ctx.fillStyle = this.isInvulnerable ? 'rgba(231, 76, 60, 0.5)' : this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👤', this.x + this.width/2, this.y + this.height/2 + 5);
    }
}

// 影子類別
class Echo {
    constructor(recording, index) {
        this.x = 50;
        this.y = 400;
        this.width = 30;
        this.height = 30;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.color = `rgba(52, 152, 219, ${Math.max(0.3, 1 - index * 0.15)})`;
        this.recording = [...recording];
        this.index = index;
    }

    update(currentTime) {
        for (let i = 0; i < this.recording.length; i++) {
            const record = this.recording[i];
            if (record.time <= currentTime) {
                this.x = record.x;
                this.y = record.y;
                this.vx = record.vx;
                this.vy = record.vy;
            } else {
                break;
            }
        }
        
        this.vy += 0.8;
        this.y += this.vy;
        this.onGround = false;
        
        if (this.y > game.canvas.height) {
            this.x = 50;
            this.y = 400;
            this.vy = 0;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.index + 1, this.x + this.width/2, this.y + this.height/2 + 4);
    }
}

// 簡化的關卡數據
const LEVELS = {
    1: {
        platforms: [
            {x: 0, y: 550, width: 1200, height: 50, color: '#8B4513'},
            {x: 200, y: 450, width: 150, height: 20, color: '#8B4513'},
            {x: 500, y: 380, width: 100, height: 20, color: '#8B4513'},
            {x: 700, y: 300, width: 120, height: 20, color: '#8B4513'},
            {x: 900, y: 220, width: 100, height: 20, color: '#8B4513'}
        ],
        switches: [
            {x: 250, y: 420, width: 30, height: 30, activated: false, color: '#e74c3c'},
            {x: 550, y: 350, width: 30, height: 30, activated: false, color: '#e74c3c'},
            {x: 750, y: 270, width: 30, height: 30, activated: false, color: '#e74c3c'}
        ],
        goal: {x: 1050, y: 170, width: 40, height: 40, color: '#27ae60'}
    },
    // 其他關卡...
};

// 全域函數
function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    window.game = new Game();
}

// 初始化
window.addEventListener('load', () => {
    // 遊戲在點擊開始按鈕後初始化
});
