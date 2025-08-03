// 遊戲核心引擎
import { Player } from '../entities/Player.js';
import { EchoSystem } from '../systems/EchoSystem.js';
import { LevelManager } from '../levels/LevelManager.js';
import { PhysicsEngine } from '../physics/PhysicsEngine.js';
import { InputHandler } from '../input/InputHandler.js';
import { Logger } from '../utils/Logger.js';

export class GameEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.player = null;
        this.echoSystem = null;
        this.levelManager = null;
        this.physicsEngine = null;
        this.inputHandler = null;
        
        // 管理器引用
        this.uiManager = null;
        this.audioManager = null;
        this.saveManager = null;
        
        // 遊戲狀態
        this.gameState = {
            currentChapter: 1,
            currentLevel: 1,
            isPlaying: false,
            isPaused: false,
            gameTime: 0,
            echoCount: 0
        };
        
        // 渲染相關
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.fps = 60;
        this.frameCount = 0;
        
        // 遊戲循環
        this.gameLoop = this.gameLoop.bind(this);
        this.isRunning = false;
    }

    async init() {
        console.log('🎮 初始化遊戲引擎...');
        
        // 獲取畫布
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            throw new Error('找不到遊戲畫布元素');
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // 初始化各個系統
        this.inputHandler = new InputHandler(this);
        this.physicsEngine = new PhysicsEngine();
        this.echoSystem = new EchoSystem(this);
        this.levelManager = new LevelManager(this);
        this.player = new Player(this);
        
        // 初始化系統
        await this.inputHandler.init();
        await this.physicsEngine.init();
        await this.echoSystem.init();
        await this.levelManager.init();
        await this.player.init();
        
        console.log('✅ 遊戲引擎初始化完成');
    }

    setManagers(managers) {
        this.uiManager = managers.ui;
        this.audioManager = managers.audio;
        this.saveManager = managers.save;
    }

    setupCanvas() {
        // 設置畫布大小
        this.resizeCanvas();
        
        // 設置渲染品質
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // 設置字體
        this.ctx.font = '16px Microsoft JhengHei, sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // 更新遊戲世界尺寸
        this.worldWidth = this.canvas.width;
        this.worldHeight = this.canvas.height;
    }

    async startChapter(chapterNumber) {
        console.log(`📖 開始第${chapterNumber}章`);
        
        this.gameState.currentChapter = chapterNumber;
        this.gameState.currentLevel = 1;
        this.gameState.isPlaying = true;
        this.gameState.gameTime = 0;
        this.gameState.echoCount = 0;
        
        // 確保所有系統都已初始化
        if (!this.player || !this.levelManager || !this.echoSystem) {
            console.error('❌ 遊戲系統未完全初始化');
            return;
        }
        
        // 載入章節
        await this.levelManager.loadChapter(chapterNumber);
        
        // 重置玩家位置
        this.player.reset();
        
        // 清除所有殘影
        this.echoSystem.clearAllEchoes();
        
        // 更新UI
        this.updateUI();
        
        // 播放章節開始音效
        this.audioManager?.playSound('chapter-start');
        
        // 顯示章節標題
        this.uiManager?.showChapterTitle(this.levelManager.getChapterTitle(chapterNumber));
        
        // 開始遊戲循環
        this.startGameLoop();
        
        console.log('✅ 章節啟動完成，玩家應該可見');
        console.log(`🎮 遊戲狀態: isPlaying=${this.gameState.isPlaying}, isRunning=${this.isRunning}`);
        console.log(`👤 玩家狀態: 位置(${this.player.x}, ${this.player.y}), 存活=${this.player.isAlive}`);
    }

    startGameLoop() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        console.log('🔄 遊戲循環已啟動');
        requestAnimationFrame(this.gameLoop);
    }

    stopGameLoop() {
        this.isRunning = false;
    }

    gameLoop(currentTime) {
        if (!this.isRunning) return;
        
        // 計算時間差
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        
        // 限制最大時間步長
        this.deltaTime = Math.min(this.deltaTime, 1/30);
        
        // 更新遊戲狀態
        if (this.gameState.isPlaying && !this.gameState.isPaused) {
            this.update(this.deltaTime);
        }
        
        // 渲染遊戲
        this.render();
        
        // 更新幀計數
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fps = Math.round(1 / this.deltaTime);
        }
        
        // 繼續遊戲循環
        requestAnimationFrame(this.gameLoop);
    }

    update(deltaTime) {
        // 更新遊戲時間
        this.gameState.gameTime += deltaTime;
        
        // 更新輸入處理
        this.inputHandler.update(deltaTime);
        
        // 更新玩家
        this.player.update(deltaTime);
        
        // 更新殘影系統
        this.echoSystem.update(deltaTime);
        
        // 更新物理引擎
        if (this.physicsEngine) {
            this.physicsEngine.update(deltaTime);
        }
        
        // 更新關卡
        this.levelManager.update(deltaTime);
        
        // 檢查遊戲狀態
        this.checkGameConditions();
    }

    render() {
        // 清除畫布
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 渲染背景
        this.renderBackground();
        
        // 渲染關卡
        this.levelManager.render(this.ctx);
        
        // 渲染殘影
        this.echoSystem.render(this.ctx);
        
        // 渲染玩家
        if (this.player) {
            this.player.render(this.ctx);
        } else {
            console.warn('⚠️ 玩家物件不存在，無法渲染');
        }
        
        // 渲染UI覆蓋層
        this.renderUIOverlay();
        
        // 渲染調試信息
        if (this.isDebugMode()) {
            this.renderDebugInfo();
        }
    }

    renderBackground() {
        // 時間扭曲背景效果
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 0,
            this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height)
        );
        
        const time = this.gameState.gameTime;
        const alpha1 = 0.1 + 0.05 * Math.sin(time * 0.5);
        const alpha2 = 0.05 + 0.03 * Math.cos(time * 0.3);
        
        gradient.addColorStop(0, `rgba(64, 224, 208, ${alpha1})`);
        gradient.addColorStop(0.5, `rgba(138, 43, 226, ${alpha2})`);
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.8)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderUIOverlay() {
        // 渲染小地圖
        this.renderMinimap();
        
        // 渲染血量條
        this.renderHealthBar();
        
        // 渲染能量條
        this.renderEnergyBar();
    }

    renderMinimap() {
        const minimapSize = 120;
        const x = this.canvas.width - minimapSize - 20;
        const y = this.canvas.height - minimapSize - 20;
        
        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y, minimapSize, minimapSize);
        
        this.ctx.strokeStyle = 'rgba(64, 224, 208, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, minimapSize, minimapSize);
        
        // 玩家位置
        const playerX = x + (this.player.x / this.worldWidth) * minimapSize;
        const playerY = y + (this.player.y / this.worldHeight) * minimapSize;
        
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.beginPath();
        this.ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 殘影位置
        this.ctx.fillStyle = '#40e0d0';
        this.echoSystem.echoes.forEach(echo => {
            const echoX = x + (echo.x / this.worldWidth) * minimapSize;
            const echoY = y + (echo.y / this.worldHeight) * minimapSize;
            
            this.ctx.beginPath();
            this.ctx.arc(echoX, echoY, 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    renderHealthBar() {
        const barWidth = 150;
        const barHeight = 8;
        const x = 20;
        const y = 20;
        
        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // 邊框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
        
        // 血量
        const healthPercent = this.player.health / this.player.maxHealth;
        const healthWidth = barWidth * healthPercent;
        
        const gradient = this.ctx.createLinearGradient(x, y, x + barWidth, y);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(1, '#ff8e8e');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, healthWidth, barHeight);
    }

    renderEnergyBar() {
        const barWidth = 120;
        const barHeight = 8;
        const x = this.canvas.width - barWidth - 20;
        const y = 20;
        
        // 背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // 邊框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, barWidth, barHeight);
        
        // 能量
        const energyPercent = this.player.energy / this.player.maxEnergy;
        const energyWidth = barWidth * energyPercent;
        
        const gradient = this.ctx.createLinearGradient(x, y, x + barWidth, y);
        gradient.addColorStop(0, '#40e0d0');
        gradient.addColorStop(1, '#8a2be2');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, energyWidth, barHeight);
    }

    renderDebugInfo() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        
        const debugInfo = [
            `FPS: ${this.fps}`,
            `Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`,
            `Echoes: ${this.echoSystem.echoes.length}`,
            `Chapter: ${this.gameState.currentChapter}`,
            `Level: ${this.gameState.currentLevel}`,
            `Time: ${this.gameState.gameTime.toFixed(1)}s`
        ];
        
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, 10, 10 + index * 15);
        });
    }

    checkGameConditions() {
        // 確保遊戲已經開始且關卡已載入
        if (!this.gameState.isPlaying || !this.levelManager.isLevelLoaded) {
            return;
        }
        
        // 檢查關卡完成條件
        if (this.levelManager.isLevelComplete()) {
            this.completeLevel();
        }
        
        // 檢查玩家死亡
        if (this.player.health <= 0) {
            this.playerDeath();
        }
        
        // 檢查章節完成
        if (this.levelManager.isChapterComplete()) {
            this.completeChapter();
        }
    }

    // 遊戲操作方法
    createEcho() {
        if (this.player.canCreateEcho()) {
            const echo = this.echoSystem.createEcho(this.player.x, this.player.y, this.player.getState());
            this.gameState.echoCount++;
            this.updateUI();
            this.audioManager?.playSound('echo-create');
            return echo;
        }
        return null;
    }

    interact() {
        const interactable = this.levelManager.getInteractableAt(this.player.x, this.player.y);
        if (interactable) {
            interactable.interact(this.player);
            this.audioManager?.playSound('interact');
        }
    }

    completeLevel() {
        console.log('🎉 關卡完成');
        this.audioManager?.playSound('level-complete');
        this.uiManager?.showLevelComplete();
        
        // 自動保存
        this.saveManager?.autoSave(this.getGameState());
    }

    completeChapter() {
        console.log('🏆 章節完成');
        this.audioManager?.playSound('chapter-complete');
        this.uiManager?.showChapterComplete();
    }

    playerDeath() {
        console.log('💀 玩家死亡');
        this.gameState.isPlaying = false;
        this.audioManager?.playSound('player-death');
        this.uiManager?.showGameOver();
    }

    // 輸入處理 - 這些方法由 InputHandler 直接處理
    handleKeyDown(event) {
        // InputHandler 已經有自己的事件監聽器
        // 這個方法保留用於兼容性
        if (this.inputHandler) {
            this.inputHandler.handleKeyDown(event);
        }
    }

    handleKeyUp(event) {
        // InputHandler 已經有自己的事件監聽器
        // 這個方法保留用於兼容性
        if (this.inputHandler) {
            this.inputHandler.handleKeyUp(event);
        }
    }

    handleResize() {
        this.resizeCanvas();
    }

    // 遊戲狀態管理
    pauseGame() {
        this.gameState.isPaused = true;
        this.audioManager?.pauseAll();
    }

    resumeGame() {
        this.gameState.isPaused = false;
        this.audioManager?.resumeAll();
    }

    getGameState() {
        return {
            ...this.gameState,
            player: this.player.getState(),
            echoes: this.echoSystem.getState(),
            level: this.levelManager.getState()
        };
    }

    async loadGameState(saveData) {
        this.gameState = { ...saveData };
        await this.player.loadState(saveData.player);
        await this.echoSystem.loadState(saveData.echoes);
        await this.levelManager.loadState(saveData.level);
        this.updateUI();
    }

    updateUI() {
        // 更新殘影計數
        const echoCountElement = document.getElementById('echo-count');
        if (echoCountElement) {
            echoCountElement.textContent = this.gameState.echoCount;
        }
        
        // 更新章節信息
        const chapterTitleElement = document.getElementById('chapter-title');
        if (chapterTitleElement) {
            chapterTitleElement.textContent = this.levelManager.getChapterTitle(this.gameState.currentChapter);
        }
    }

    isGameActive() {
        return this.gameState.isPlaying;
    }

    isDebugMode() {
        return window.location.search.includes('debug=true');
    }
}