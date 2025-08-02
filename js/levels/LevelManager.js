// 關卡管理器 - 處理關卡載入、更新和渲染
export class LevelManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.currentChapter = 1;
        this.currentLevel = 1;
        this.levelData = null;
        this.objects = [];
        this.triggers = [];
        this.isLevelLoaded = false;
        
        // 章節配置
        this.chapters = {
            1: {
                title: '第一章：殘影初醒',
                description: '學會創建並配合Echo，發現這些Echo不只是錄像',
                levels: 3,
                theme: 'awakening'
            },
            2: {
                title: '第二章：記憶交錯',
                description: '多段Echo合作解謎，面對過去的錯誤',
                levels: 4,
                theme: 'memory'
            },
            3: {
                title: '第三章：重演無法改變的命運',
                description: '無法改變的痛苦記憶，與自我分裂體戰鬥',
                levels: 5,
                theme: 'fate'
            },
            4: {
                title: '第四章：時序審判',
                description: 'Echo分裂為兩派，做出關鍵選擇',
                levels: 4,
                theme: 'judgment'
            },
            5: {
                title: '第五章：你，與我',
                description: '最終對決，與自己和解或掙脫輪迴',
                levels: 3,
                theme: 'resolution'
            }
        };
        
        // 物件類型
        this.objectTypes = {
            wall: { solid: true, color: '#666666' },
            door: { solid: true, interactive: true, color: '#8B4513' },
            switch: { solid: false, interactive: true, color: '#FFD700' },
            pickup: { solid: false, interactive: true, color: '#00FF00' },
            memory: { solid: false, interactive: true, color: '#8A2BE2' },
            barrier: { solid: true, color: '#FF0000', requiresEcho: true },
            platform: { solid: true, color: '#4169E1', movable: true }
        };
    }

    async init() {
        console.log('🗺️ 初始化關卡管理器');
    }

    async loadChapter(chapterNumber) {
        console.log(`📖 載入第${chapterNumber}章`);
        
        this.currentChapter = chapterNumber;
        this.currentLevel = 1;
        
        // 載入第一關
        await this.loadLevel(chapterNumber, 1);
    }

    async loadLevel(chapter, level) {
        console.log(`🗺️ 載入關卡 ${chapter}-${level}`);
        
        this.currentChapter = chapter;
        this.currentLevel = level;
        
        // 生成關卡數據
        this.levelData = this.generateLevelData(chapter, level);
        
        // 清除現有物件
        this.objects = [];
        this.triggers = [];
        
        // 創建關卡物件
        this.createLevelObjects();
        
        this.isLevelLoaded = true;
        
        // 播放關卡載入音效
        this.gameEngine.audioManager?.playSound('level-load');
    }

    generateLevelData(chapter, level) {
        // 根據章節和關卡生成不同的關卡布局
        const canvas = this.gameEngine.canvas;
        const width = canvas.width;
        const height = canvas.height;
        
        const levelData = {
            width: width,
            height: height,
            playerStart: { x: 100, y: height - 100 },
            goal: { x: width - 100, y: 100 },
            objects: [],
            theme: this.chapters[chapter]?.theme || 'default'
        };
        
        // 根據章節生成不同類型的關卡
        switch (chapter) {
            case 1:
                this.generateChapter1Level(levelData, level);
                break;
            case 2:
                this.generateChapter2Level(levelData, level);
                break;
            case 3:
                this.generateChapter3Level(levelData, level);
                break;
            case 4:
                this.generateChapter4Level(levelData, level);
                break;
            case 5:
                this.generateChapter5Level(levelData, level);
                break;
            default:
                this.generateDefaultLevel(levelData, level);
        }
        
        return levelData;
    }

    generateChapter1Level(levelData, level) {
        const { width, height } = levelData;
        
        // 第一章：教學關卡，簡單的障礙和解謎
        switch (level) {
            case 1:
                // 基礎移動教學
                levelData.objects.push(
                    { type: 'wall', x: 200, y: height - 200, width: 20, height: 100 },
                    { type: 'wall', x: 400, y: height - 150, width: 20, height: 50 },
                    { type: 'memory', x: 300, y: height - 50, width: 40, height: 40, 
                      memory: { text: '這裡曾經是我的家...' } }
                );
                break;
                
            case 2:
                // Echo創建教學
                levelData.objects.push(
                    { type: 'barrier', x: 300, y: height - 200, width: 20, height: 200 },
                    { type: 'switch', x: 150, y: height - 50, width: 30, height: 30,
                      target: 'barrier_1' },
                    { type: 'memory', x: 500, y: height - 50, width: 40, height: 40,
                      memory: { text: '我需要過去的自己幫助我...' } }
                );
                break;
                
            case 3:
                // Echo協作教學
                levelData.objects.push(
                    { type: 'wall', x: 200, y: height - 300, width: 20, height: 200 },
                    { type: 'wall', x: 400, y: height - 250, width: 20, height: 150 },
                    { type: 'platform', x: 300, y: height - 100, width: 80, height: 20 },
                    { type: 'switch', x: 100, y: height - 50, width: 30, height: 30 },
                    { type: 'switch', x: 500, y: height - 50, width: 30, height: 30 }
                );
                break;
        }
    }

    generateChapter2Level(levelData, level) {
        const { width, height } = levelData;
        
        // 第二章：複雜的Echo協作謎題
        switch (level) {
            case 1:
                // 多重開關謎題
                levelData.objects.push(
                    { type: 'barrier', x: 250, y: height - 300, width: 20, height: 300 },
                    { type: 'barrier', x: 450, y: height - 250, width: 20, height: 250 },
                    { type: 'switch', x: 100, y: height - 50, width: 30, height: 30 },
                    { type: 'switch', x: 350, y: height - 50, width: 30, height: 30 },
                    { type: 'switch', x: 600, y: height - 50, width: 30, height: 30 }
                );
                break;
                
            case 2:
                // 時序謎題
                levelData.objects.push(
                    { type: 'platform', x: 200, y: height - 150, width: 60, height: 20, movable: true },
                    { type: 'platform', x: 400, y: height - 200, width: 60, height: 20, movable: true },
                    { type: 'wall', x: 300, y: height - 350, width: 20, height: 250 },
                    { type: 'memory', x: 500, y: height - 300, width: 40, height: 40,
                      memory: { text: '時間的順序很重要...' } }
                );
                break;
        }
    }

    generateChapter3Level(levelData, level) {
        const { width, height } = levelData;
        
        // 第三章：無法改變的命運，更困難的謎題
        levelData.objects.push(
            { type: 'wall', x: width/2 - 10, y: height - 400, width: 20, height: 300 },
            { type: 'memory', x: width/2 - 20, y: height - 450, width: 40, height: 40,
              memory: { text: '有些事情，無論如何都無法改變...' } }
        );
    }

    generateChapter4Level(levelData, level) {
        const { width, height } = levelData;
        
        // 第四章：Echo分裂，道德選擇
        levelData.objects.push(
            { type: 'barrier', x: 200, y: height - 300, width: 20, height: 300 },
            { type: 'barrier', x: width - 220, y: height - 300, width: 20, height: 300 },
            { type: 'memory', x: width/2 - 20, y: height - 50, width: 40, height: 40,
              memory: { text: '你會選擇哪一個自己？' } }
        );
    }

    generateChapter5Level(levelData, level) {
        const { width, height } = levelData;
        
        // 第五章：最終對決
        levelData.objects.push(
            { type: 'memory', x: width/2 - 20, y: height/2 - 20, width: 40, height: 40,
              memory: { text: '是時候面對真正的自己了...' } }
        );
    }

    generateDefaultLevel(levelData, level) {
        // 預設關卡生成
        const { width, height } = levelData;
        
        levelData.objects.push(
            { type: 'wall', x: 300, y: height - 200, width: 20, height: 200 },
            { type: 'memory', x: 500, y: height - 50, width: 40, height: 40,
              memory: { text: '這是一個測試關卡' } }
        );
    }

    createLevelObjects() {
        if (!this.levelData) return;
        
        this.levelData.objects.forEach(objData => {
            const obj = new LevelObject(objData, this.gameEngine);
            this.objects.push(obj);
        });
        
        // 設置玩家起始位置
        if (this.gameEngine.player && this.levelData.playerStart) {
            this.gameEngine.player.x = this.levelData.playerStart.x;
            this.gameEngine.player.y = this.levelData.playerStart.y;
            console.log(`🗺️ 設置玩家位置: (${this.gameEngine.player.x}, ${this.gameEngine.player.y})`);
        }
    }

    update(deltaTime) {
        if (!this.isLevelLoaded) return;
        
        // 更新所有關卡物件
        this.objects.forEach(obj => {
            obj.update(deltaTime);
        });
        
        // 檢查觸發器
        this.checkTriggers();
    }

    render(ctx) {
        if (!this.isLevelLoaded) return;
        
        // 渲染背景
        this.renderBackground(ctx);
        
        // 渲染所有關卡物件
        this.objects.forEach(obj => {
            obj.render(ctx);
        });
        
        // 渲染目標點
        this.renderGoal(ctx);
    }

    renderBackground(ctx) {
        const { width, height } = this.levelData;
        
        // 根據章節主題渲染不同的背景
        const theme = this.levelData.theme;
        
        switch (theme) {
            case 'awakening':
                this.renderAwakeningBackground(ctx, width, height);
                break;
            case 'memory':
                this.renderMemoryBackground(ctx, width, height);
                break;
            case 'fate':
                this.renderFateBackground(ctx, width, height);
                break;
            case 'judgment':
                this.renderJudgmentBackground(ctx, width, height);
                break;
            case 'resolution':
                this.renderResolutionBackground(ctx, width, height);
                break;
            default:
                this.renderDefaultBackground(ctx, width, height);
        }
    }

    renderAwakeningBackground(ctx, width, height) {
        // 淡藍色調，代表初醒
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(64, 224, 208, 0.1)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderMemoryBackground(ctx, width, height) {
        // 紫色調，代表記憶
        const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        gradient.addColorStop(0, 'rgba(138, 43, 226, 0.2)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderFateBackground(ctx, width, height) {
        // 紅色調，代表命運
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(255, 107, 107, 0.1)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderJudgmentBackground(ctx, width, height) {
        // 金色調，代表審判
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderResolutionBackground(ctx, width, height) {
        // 白色調，代表解脫
        const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(10, 10, 10, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    renderDefaultBackground(ctx, width, height) {
        // 預設背景
        ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
        ctx.fillRect(0, 0, width, height);
    }

    renderGoal(ctx) {
        if (!this.levelData.goal) return;
        
        const { x, y } = this.levelData.goal;
        const time = this.gameEngine.gameState.gameTime;
        
        // 目標點光環效果
        const radius = 30 + 10 * Math.sin(time * 2);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 目標點核心
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
    }

    checkTriggers() {
        const player = this.gameEngine.player;
        if (!player) return;
        
        // 檢查是否到達目標點
        if (this.levelData.goal) {
            const dx = player.x - this.levelData.goal.x;
            const dy = player.y - this.levelData.goal.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 40) {
                this.completeLevel();
            }
        }
    }

    completeLevel() {
        console.log(`🎉 完成關卡 ${this.currentChapter}-${this.currentLevel}`);
        
        // 檢查是否還有下一關
        const chapterData = this.chapters[this.currentChapter];
        if (this.currentLevel < chapterData.levels) {
            // 載入下一關
            setTimeout(() => {
                this.loadLevel(this.currentChapter, this.currentLevel + 1);
            }, 2000);
        } else {
            // 章節完成
            this.completeChapter();
        }
    }

    completeChapter() {
        console.log(`🏆 完成第${this.currentChapter}章`);
        
        // 檢查是否還有下一章
        if (this.currentChapter < Object.keys(this.chapters).length) {
            // 載入下一章
            setTimeout(() => {
                this.loadChapter(this.currentChapter + 1);
            }, 3000);
        } else {
            // 遊戲完成
            this.completeGame();
        }
    }

    completeGame() {
        console.log('🎊 遊戲完成！');
        this.gameEngine.uiManager?.showGameComplete();
    }

    // 碰撞檢測
    checkCollisions(bounds) {
        const collisions = [];
        
        this.objects.forEach(obj => {
            if (obj.checkCollision(bounds)) {
                collisions.push({
                    type: obj.type,
                    object: obj,
                    overlap: obj.getOverlap(bounds)
                });
            }
        });
        
        return collisions;
    }

    // 獲取指定位置的可互動物件
    getInteractableAt(x, y) {
        return this.objects.find(obj => 
            obj.isInteractive && obj.isPointInside(x, y)
        );
    }

    // 觸發事件
    triggerEvent(eventId) {
        console.log(`🎯 觸發事件: ${eventId}`);
        // 處理特定事件
    }

    // 狀態檢查
    isLevelComplete() {
        // 檢查關卡完成條件
        return false; // 由 checkTriggers 處理
    }

    isChapterComplete() {
        const chapterData = this.chapters[this.currentChapter];
        return this.currentLevel >= chapterData.levels;
    }

    // 獲取章節標題
    getChapterTitle(chapter) {
        return this.chapters[chapter]?.title || `第${chapter}章`;
    }

    // 狀態管理
    getState() {
        return {
            currentChapter: this.currentChapter,
            currentLevel: this.currentLevel,
            levelData: this.levelData,
            objects: this.objects.map(obj => obj.getState())
        };
    }

    async loadState(state) {
        this.currentChapter = state.currentChapter;
        this.currentLevel = state.currentLevel;
        this.levelData = state.levelData;
        
        // 重建物件
        this.objects = [];
        if (state.objects) {
            state.objects.forEach(objState => {
                const obj = new LevelObject(objState, this.gameEngine);
                obj.loadState(objState);
                this.objects.push(obj);
            });
        }
        
        this.isLevelLoaded = true;
    }
}

// 關卡物件類別
class LevelObject {
    constructor(data, gameEngine) {
        this.gameEngine = gameEngine;
        this.type = data.type;
        this.x = data.x;
        this.y = data.y;
        this.width = data.width;
        this.height = data.height;
        
        // 從物件類型獲取屬性
        const typeConfig = gameEngine.levelManager.objectTypes[this.type] || {};
        this.solid = typeConfig.solid || false;
        this.interactive = typeConfig.interactive || false;
        this.color = typeConfig.color || '#FFFFFF';
        this.requiresEcho = typeConfig.requiresEcho || false;
        this.movable = typeConfig.movable || false;
        
        // 特殊屬性
        this.memory = data.memory || null;
        this.target = data.target || null;
        this.isActivated = false;
        
        // 動畫
        this.animationTime = 0;
    }

    update(deltaTime) {
        this.animationTime += deltaTime;
        
        // 更新特定類型的邏輯
        if (this.type === 'platform' && this.movable) {
            // 移動平台邏輯
        }
    }

    render(ctx) {
        ctx.save();
        
        // 根據類型渲染不同的外觀
        switch (this.type) {
            case 'wall':
                this.renderWall(ctx);
                break;
            case 'door':
                this.renderDoor(ctx);
                break;
            case 'switch':
                this.renderSwitch(ctx);
                break;
            case 'memory':
                this.renderMemory(ctx);
                break;
            case 'barrier':
                this.renderBarrier(ctx);
                break;
            case 'platform':
                this.renderPlatform(ctx);
                break;
            default:
                this.renderDefault(ctx);
        }
        
        ctx.restore();
    }

    renderWall(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 邊框
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    renderDoor(ctx) {
        ctx.fillStyle = this.isActivated ? '#90EE90' : this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 門把
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 10, this.y + this.height/2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    renderSwitch(ctx) {
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;
        
        // 開關底座
        ctx.fillStyle = '#666666';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 開關按鈕
        ctx.fillStyle = this.isActivated ? '#00FF00' : '#FF0000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width/3, 0, Math.PI * 2);
        ctx.fill();
    }

    renderMemory(ctx) {
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;
        const pulse = 1 + 0.2 * Math.sin(this.animationTime * 3);
        
        // 記憶碎片光環
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, this.width/2 * pulse
        );
        gradient.addColorStop(0, 'rgba(138, 43, 226, 0.8)');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width/2 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // 核心
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.width/3, 0, Math.PI * 2);
        ctx.fill();
    }

    renderBarrier(ctx) {
        if (this.isActivated) return; // 已激活的屏障不顯示
        
        // 時間屏障效果
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
        gradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0.6)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 電流效果
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const y = this.y + (this.height / 4) * (i + 1);
            ctx.beginPath();
            ctx.moveTo(this.x, y);
            ctx.lineTo(this.x + this.width, y + Math.sin(this.animationTime * 5 + i) * 5);
            ctx.stroke();
        }
    }

    renderPlatform(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 平台紋理
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i, this.y + this.height);
            ctx.stroke();
        }
    }

    renderDefault(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    // 碰撞檢測
    checkCollision(bounds) {
        return !(bounds.x + bounds.width < this.x ||
                bounds.x > this.x + this.width ||
                bounds.y + bounds.height < this.y ||
                bounds.y > this.y + this.height);
    }

    getOverlap(bounds) {
        const overlapX = Math.min(bounds.x + bounds.width, this.x + this.width) - Math.max(bounds.x, this.x);
        const overlapY = Math.min(bounds.y + bounds.height, this.y + this.height) - Math.max(bounds.y, this.y);
        
        return { x: overlapX, y: overlapY };
    }

    isPointInside(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    // 互動
    interact(player) {
        if (!this.interactive) return false;
        
        switch (this.type) {
            case 'switch':
                this.isActivated = !this.isActivated;
                this.gameEngine.audioManager?.playSound('interact');
                return true;
                
            case 'memory':
                if (this.memory) {
                    this.gameEngine.uiManager?.showMemoryFragment(this.memory);
                    return true;
                }
                break;
                
            case 'door':
                if (!this.isActivated) {
                    this.isActivated = true;
                    this.solid = false;
                    this.gameEngine.audioManager?.playSound('door-open');
                    return true;
                }
                break;
        }
        
        return false;
    }

    // 狀態管理
    getState() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            isActivated: this.isActivated,
            memory: this.memory,
            target: this.target
        };
    }

    loadState(state) {
        this.isActivated = state.isActivated || false;
        this.solid = this.isActivated ? false : this.solid;
    }
}