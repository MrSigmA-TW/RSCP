// 玩家角色類別
export class Player {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // 位置和移動
        this.x = 400;
        this.y = 300;
        this.width = 40;
        this.height = 40;
        this.speed = 200; // 像素/秒
        this.velocity = { x: 0, y: 0 };
        
        // 生命值和能量
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.maxEnergy = 100;
        this.energy = this.maxEnergy;
        this.energyRegenRate = 20; // 每秒恢復的能量
        
        // 殘影相關
        this.echoEnergyCost = 30;
        this.echoCooldown = 0;
        this.echoCooldownTime = 2; // 秒
        
        // 動畫和視覺效果
        this.animationTime = 0;
        this.isMoving = false;
        this.facingDirection = 'right';
        
        // 輸入狀態
        this.inputState = {
            up: false,
            down: false,
            left: false,
            right: false,
            action: false,
            echo: false
        };
        
        // 狀態
        this.isAlive = true;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.invulnerabilityDuration = 1; // 秒
    }

    async init() {
        console.log('👤 初始化玩家');
        this.reset();
    }

    reset() {
        // 設置玩家初始位置（確保在畫布範圍內）
        const canvas = this.gameEngine.canvas;
        if (canvas) {
            this.x = Math.max(50, Math.min(400, canvas.width - 50));
            this.y = Math.max(50, Math.min(300, canvas.height - 50));
        } else {
            this.x = 400;
            this.y = 300;
        }
        console.log(`👤 玩家重置位置: (${this.x}, ${this.y}), 畫布大小: ${canvas ? canvas.width + 'x' + canvas.height : '未知'}`);
        this.velocity = { x: 0, y: 0 };
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.echoCooldown = 0;
        this.isAlive = true;
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.animationTime = 0;
        this.isMoving = false;
    }

    update(deltaTime) {
        if (!this.isAlive) return;
        
        // 更新動畫時間
        this.animationTime += deltaTime;
        
        // 更新冷卻時間
        if (this.echoCooldown > 0) {
            this.echoCooldown -= deltaTime;
        }
        
        // 更新無敵時間
        if (this.isInvulnerable) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.isInvulnerable = false;
            }
        }
        
        // 處理移動
        this.handleMovement(deltaTime);
        
        // 恢復能量
        this.regenerateEnergy(deltaTime);
        
        // 更新位置
        this.updatePosition(deltaTime);
        
        // 檢查邊界
        this.checkBounds();
        
        // 檢查碰撞
        this.checkCollisions();
    }

    handleMovement(deltaTime) {
        let moveX = 0;
        let moveY = 0;
        
        // 計算移動方向
        if (this.inputState.left) moveX -= 1;
        if (this.inputState.right) moveX += 1;
        if (this.inputState.up) moveY -= 1;
        if (this.inputState.down) moveY += 1;
        
        // 正規化對角線移動
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707; // 1/√2
            moveY *= 0.707;
        }
        
        // 設置速度
        this.velocity.x = moveX * this.speed;
        this.velocity.y = moveY * this.speed;
        
        // 更新移動狀態
        this.isMoving = moveX !== 0 || moveY !== 0;
        
        // 更新面向方向
        if (moveX > 0) this.facingDirection = 'right';
        else if (moveX < 0) this.facingDirection = 'left';
    }

    updatePosition(deltaTime) {
        // 更新位置
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
    }

    checkBounds() {
        const canvas = this.gameEngine.canvas;
        
        // 限制在畫布範圍內
        if (this.x < this.width / 2) {
            this.x = this.width / 2;
        }
        if (this.x > canvas.width - this.width / 2) {
            this.x = canvas.width - this.width / 2;
        }
        if (this.y < this.height / 2) {
            this.y = this.height / 2;
        }
        if (this.y > canvas.height - this.height / 2) {
            this.y = canvas.height - this.height / 2;
        }
    }

    checkCollisions() {
        // 檢查與關卡物件的碰撞
        const levelManager = this.gameEngine.levelManager;
        if (levelManager) {
            const collisions = levelManager.checkCollisions(this.getBounds());
            this.handleCollisions(collisions);
        }
    }

    handleCollisions(collisions) {
        collisions.forEach(collision => {
            switch (collision.type) {
                case 'wall':
                    this.handleWallCollision(collision);
                    break;
                case 'damage':
                    this.takeDamage(collision.damage || 10);
                    break;
                case 'pickup':
                    this.handlePickup(collision);
                    break;
                case 'trigger':
                    this.handleTrigger(collision);
                    break;
            }
        });
    }

    handleWallCollision(collision) {
        // 簡單的碰撞回應 - 停止移動
        this.velocity.x = 0;
        this.velocity.y = 0;
        
        // 將玩家推出牆壁
        const overlap = collision.overlap;
        if (overlap) {
            this.x -= overlap.x;
            this.y -= overlap.y;
        }
    }

    handlePickup(pickup) {
        switch (pickup.subtype) {
            case 'health':
                this.heal(pickup.value || 20);
                break;
            case 'energy':
                this.restoreEnergy(pickup.value || 30);
                break;
            case 'memory':
                this.gameEngine.uiManager?.showMemoryFragment(pickup.memory);
                break;
        }
        
        // 播放拾取音效
        this.gameEngine.audioManager?.playSound('pickup');
    }

    handleTrigger(trigger) {
        // 觸發關卡事件
        this.gameEngine.levelManager?.triggerEvent(trigger.eventId);
    }

    regenerateEnergy(deltaTime) {
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * deltaTime);
        }
    }

    render(ctx) {
        if (!this.isAlive) {
            console.log('👤 玩家已死亡，不渲染');
            return;
        }
        
        // 調試：確認渲染被調用
        if (window.location.search.includes('debug=true')) {
            console.log(`👤 渲染玩家於 (${this.x}, ${this.y})`);
        }
        
        ctx.save();
        
        // 無敵閃爍效果
        if (this.isInvulnerable) {
            const alpha = 0.5 + 0.5 * Math.sin(this.animationTime * 10);
            ctx.globalAlpha = alpha;
        }
        
        // 繪製玩家
        this.renderCharacter(ctx);
        
        // 繪製移動軌跡
        if (this.isMoving) {
            this.renderMovementTrail(ctx);
        }
        
        ctx.restore();
    }

    renderCharacter(ctx) {
        const centerX = this.x;
        const centerY = this.y;
        const radius = this.width / 2;
        
        // 主體光環
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius + 10
        );
        gradient.addColorStop(0, 'rgba(255, 107, 107, 0.9)');
        gradient.addColorStop(0.7, 'rgba(255, 107, 107, 0.4)');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 核心
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 邊框
        ctx.strokeStyle = '#ff8e8e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 能量指示器
        if (this.energy < this.maxEnergy) {
            this.renderEnergyIndicator(ctx, centerX, centerY - radius - 15);
        }
        
        // 殘影冷卻指示器
        if (this.echoCooldown > 0) {
            this.renderCooldownIndicator(ctx, centerX, centerY);
        }
    }

    renderMovementTrail(ctx) {
        // 簡單的移動軌跡效果
        const trailLength = 5;
        const trailAlpha = 0.3;
        
        for (let i = 0; i < trailLength; i++) {
            const alpha = trailAlpha * (1 - i / trailLength);
            const offsetX = -this.velocity.x * 0.01 * i;
            const offsetY = -this.velocity.y * 0.01 * i;
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(this.x + offsetX, this.y + offsetY, this.width / 2 - i, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
    }

    renderEnergyIndicator(ctx, x, y) {
        const barWidth = 40;
        const barHeight = 4;
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
        
        // 能量條
        const energyPercent = this.energy / this.maxEnergy;
        const energyWidth = barWidth * energyPercent;
        
        const gradient = ctx.createLinearGradient(x - barWidth / 2, y, x + barWidth / 2, y);
        gradient.addColorStop(0, '#40e0d0');
        gradient.addColorStop(1, '#8a2be2');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - barWidth / 2, y, energyWidth, barHeight);
    }

    renderCooldownIndicator(ctx, centerX, centerY) {
        const radius = this.width / 2 + 5;
        const progress = 1 - (this.echoCooldown / this.echoCooldownTime);
        const endAngle = -Math.PI / 2 + (Math.PI * 2 * progress);
        
        ctx.strokeStyle = 'rgba(64, 224, 208, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
        ctx.stroke();
    }

    // 輸入處理
    setInputState(key, pressed) {
        if (key in this.inputState) {
            this.inputState[key] = pressed;
            // 只在調試模式下輸出輸入日誌
            if (window.location.search.includes('debug=true')) {
                console.log(`🎮 玩家輸入: ${key} = ${pressed}`);
            }
        }
    }

    // 行動方法
    canCreateEcho() {
        return this.energy >= this.echoEnergyCost && this.echoCooldown <= 0 && this.isAlive;
    }

    createEcho() {
        if (this.canCreateEcho()) {
            this.energy -= this.echoEnergyCost;
            this.echoCooldown = this.echoCooldownTime;
            return true;
        }
        return false;
    }

    takeDamage(amount) {
        if (this.isInvulnerable || !this.isAlive) return false;
        
        this.health = Math.max(0, this.health - amount);
        this.isInvulnerable = true;
        this.invulnerabilityTime = this.invulnerabilityDuration;
        
        // 播放受傷音效
        this.gameEngine.audioManager?.playSound('player-hurt');
        
        // 檢查死亡
        if (this.health <= 0) {
            this.die();
        }
        
        return true;
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
        this.gameEngine.audioManager?.playSound('heal');
    }

    restoreEnergy(amount) {
        this.energy = Math.min(this.maxEnergy, this.energy + amount);
    }

    die() {
        this.isAlive = false;
        this.gameEngine.audioManager?.playSound('player-death');
    }

    // 碰撞檢測
    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height,
            centerX: this.x,
            centerY: this.y
        };
    }

    // 狀態管理
    getState() {
        return {
            x: this.x,
            y: this.y,
            health: this.health,
            energy: this.energy,
            facingDirection: this.facingDirection,
            isAlive: this.isAlive
        };
    }

    async loadState(state) {
        this.x = state.x || this.x;
        this.y = state.y || this.y;
        this.health = state.health || this.maxHealth;
        this.energy = state.energy || this.maxEnergy;
        this.facingDirection = state.facingDirection || 'right';
        this.isAlive = state.isAlive !== undefined ? state.isAlive : true;
    }
}