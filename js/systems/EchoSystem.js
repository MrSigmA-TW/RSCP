// 殘影系統 - 核心遊戲機制
export class EchoSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.echoes = [];
        this.maxEchoes = 5; // 最大殘影數量
        this.echoLifetime = 30; // 殘影存在時間（秒）
        this.isRecording = false;
        this.recordingData = [];
        this.recordingInterval = 0.1; // 記錄間隔（秒）
        this.lastRecordTime = 0;
    }

    async init() {
        console.log('👻 初始化殘影系統');
    }

    update(deltaTime) {
        // 更新所有殘影
        this.echoes.forEach(echo => {
            echo.update(deltaTime);
        });

        // 移除過期的殘影
        this.echoes = this.echoes.filter(echo => !echo.isExpired());

        // 如果正在記錄，更新記錄
        if (this.isRecording) {
            this.updateRecording(deltaTime);
        }
    }

    render(ctx) {
        // 渲染所有殘影
        this.echoes.forEach(echo => {
            echo.render(ctx);
        });

        // 渲染殘影軌跡
        this.renderEchoTrails(ctx);
    }

    createEcho(x, y, playerState) {
        // 檢查是否達到最大數量
        if (this.echoes.length >= this.maxEchoes) {
            // 移除最舊的殘影
            this.echoes.shift();
        }

        // 創建新殘影
        const echo = new Echo(this.gameEngine, x, y, playerState);
        
        // 如果有記錄數據，設置給殘影
        if (this.recordingData.length > 0) {
            echo.setRecordingData([...this.recordingData]);
            this.clearRecording(); // 清除記錄數據
        }

        this.echoes.push(echo);

        // 開始新的記錄
        this.startRecording();

        console.log(`👻 創建殘影 #${this.echoes.length} 於 (${Math.round(x)}, ${Math.round(y)})`);
        return echo;
    }

    startRecording() {
        this.isRecording = true;
        this.recordingData = [];
        this.lastRecordTime = 0;
        
        // 記錄初始狀態
        this.recordPlayerState();
    }

    stopRecording() {
        this.isRecording = false;
    }

    clearRecording() {
        this.recordingData = [];
        this.isRecording = false;
    }

    updateRecording(deltaTime) {
        this.lastRecordTime += deltaTime;
        
        if (this.lastRecordTime >= this.recordingInterval) {
            this.recordPlayerState();
            this.lastRecordTime = 0;
        }
    }

    recordPlayerState() {
        const player = this.gameEngine.player;
        if (!player) return;

        const state = {
            x: player.x,
            y: player.y,
            velocity: { ...player.velocity },
            facingDirection: player.facingDirection,
            isMoving: player.isMoving,
            timestamp: this.gameEngine.gameState.gameTime
        };

        this.recordingData.push(state);

        // 限制記錄數據長度
        if (this.recordingData.length > 300) { // 30秒的數據
            this.recordingData.shift();
        }
    }

    renderEchoTrails(ctx) {
        // 渲染殘影之間的連接線
        if (this.echoes.length < 2) return;

        ctx.save();
        ctx.strokeStyle = 'rgba(64, 224, 208, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        for (let i = 0; i < this.echoes.length - 1; i++) {
            const echo1 = this.echoes[i];
            const echo2 = this.echoes[i + 1];

            ctx.beginPath();
            ctx.moveTo(echo1.x, echo1.y);
            ctx.lineTo(echo2.x, echo2.y);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 獲取指定位置附近的殘影
    getEchoesNear(x, y, radius = 50) {
        return this.echoes.filter(echo => {
            const dx = echo.x - x;
            const dy = echo.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= radius;
        });
    }

    // 獲取最近的殘影
    getNearestEcho(x, y) {
        if (this.echoes.length === 0) return null;

        let nearest = null;
        let minDistance = Infinity;

        this.echoes.forEach(echo => {
            const dx = echo.x - x;
            const dy = echo.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = echo;
            }
        });

        return nearest;
    }

    // 清除所有殘影
    clearAllEchoes() {
        this.echoes = [];
        this.clearRecording();
        console.log('👻 清除所有殘影');
    }

    // 狀態管理
    clearAllEchoes() {
        console.log('👻 清除所有殘影');
        this.echoes = [];
        this.isRecording = false;
        this.recordingData = [];
    }

    getState() {
        return {
            echoes: this.echoes.map(echo => echo.getState()),
            recordingData: [...this.recordingData],
            isRecording: this.isRecording
        };
    }

    async loadState(state) {
        this.echoes = [];
        this.recordingData = state.recordingData || [];
        this.isRecording = state.isRecording || false;

        // 重建殘影
        if (state.echoes) {
            for (const echoState of state.echoes) {
                const echo = new Echo(this.gameEngine, echoState.x, echoState.y, echoState.playerState);
                await echo.loadState(echoState);
                this.echoes.push(echo);
            }
        }
    }
}

// 殘影類別
class Echo {
    constructor(gameEngine, x, y, playerState) {
        this.gameEngine = gameEngine;
        this.x = x;
        this.y = y;
        this.originalX = x;
        this.originalY = y;
        this.playerState = { ...playerState };
        
        // 殘影屬性
        this.age = 0;
        this.maxAge = 30; // 30秒生命週期
        this.alpha = 1;
        this.scale = 1;
        
        // 回放相關
        this.recordingData = [];
        this.playbackIndex = 0;
        this.playbackTime = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1;
        
        // 視覺效果
        this.pulseTime = 0;
        this.trailPoints = [];
        this.maxTrailPoints = 10;
        
        // 互動狀態
        this.isSelected = false;
        this.isActive = false;
        
        // 對話系統
        this.hasDialogue = true;
        this.dialogueShown = false;
        this.personality = this.generatePersonality();
    }

    update(deltaTime) {
        this.age += deltaTime;
        this.pulseTime += deltaTime;
        
        // 更新透明度（隨時間衰減）
        this.alpha = Math.max(0, 1 - (this.age / this.maxAge));
        
        // 更新縮放（脈衝效果）
        this.scale = 1 + 0.1 * Math.sin(this.pulseTime * 2);
        
        // 如果正在回放記錄
        if (this.isPlaying && this.recordingData.length > 0) {
            this.updatePlayback(deltaTime);
        }
        
        // 更新軌跡點
        this.updateTrail();
    }

    updatePlayback(deltaTime) {
        this.playbackTime += deltaTime * this.playbackSpeed;
        
        // 計算當前應該播放的幀
        const frameTime = 0.1; // 記錄間隔
        const targetIndex = Math.floor(this.playbackTime / frameTime);
        
        if (targetIndex < this.recordingData.length) {
            const frame = this.recordingData[targetIndex];
            this.x = frame.x;
            this.y = frame.y;
            this.playbackIndex = targetIndex;
        } else {
            // 回放結束，回到原點
            this.isPlaying = false;
            this.x = this.originalX;
            this.y = this.originalY;
            this.playbackTime = 0;
            this.playbackIndex = 0;
        }
    }

    updateTrail() {
        // 添加當前位置到軌跡
        this.trailPoints.push({ x: this.x, y: this.y, time: this.age });
        
        // 限制軌跡點數量
        if (this.trailPoints.length > this.maxTrailPoints) {
            this.trailPoints.shift();
        }
    }

    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // 渲染軌跡
        this.renderTrail(ctx);
        
        // 渲染殘影本體
        this.renderBody(ctx);
        
        // 渲染選中效果
        if (this.isSelected) {
            this.renderSelectionEffect(ctx);
        }
        
        // 渲染對話指示器
        if (this.hasDialogue && !this.dialogueShown) {
            this.renderDialogueIndicator(ctx);
        }
        
        ctx.restore();
    }

    renderTrail(ctx) {
        if (this.trailPoints.length < 2) return;
        
        ctx.strokeStyle = `rgba(64, 224, 208, ${this.alpha * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        for (let i = 0; i < this.trailPoints.length; i++) {
            const point = this.trailPoints[i];
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        
        ctx.stroke();
    }

    renderBody(ctx) {
        const radius = 20 * this.scale;
        
        // 外圈光環
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, radius + 10
        );
        gradient.addColorStop(0, `rgba(64, 224, 208, ${this.alpha * 0.8})`);
        gradient.addColorStop(0.7, `rgba(64, 224, 208, ${this.alpha * 0.3})`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius + 10, 0, Math.PI * 2);
        ctx.fill();
        
        // 核心
        ctx.fillStyle = `rgba(64, 224, 208, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 邊框
        ctx.strokeStyle = `rgba(100, 255, 218, ${this.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // 內部紋理
        ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha * 0.5})`;
        ctx.lineWidth = 1;
        const innerRadius = radius * 0.6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, innerRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderSelectionEffect(ctx) {
        const radius = 25 * this.scale;
        const pulseRadius = radius + 5 + 3 * Math.sin(this.pulseTime * 4);
        
        ctx.strokeStyle = `rgba(138, 43, 226, ${this.alpha * 0.8})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    renderDialogueIndicator(ctx) {
        const offsetY = -35;
        const indicatorY = this.y + offsetY + 3 * Math.sin(this.pulseTime * 3);
        
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.8})`;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💭', this.x, indicatorY);
    }

    // 設置記錄數據
    setRecordingData(data) {
        this.recordingData = [...data];
    }

    // 開始回放
    startPlayback() {
        if (this.recordingData.length > 0) {
            this.isPlaying = true;
            this.playbackTime = 0;
            this.playbackIndex = 0;
            console.log(`👻 殘影開始回放，共 ${this.recordingData.length} 幀`);
        }
    }

    // 停止回放
    stopPlayback() {
        this.isPlaying = false;
        this.x = this.originalX;
        this.y = this.originalY;
        this.playbackTime = 0;
        this.playbackIndex = 0;
    }

    // 生成個性
    generatePersonality() {
        const personalities = [
            { type: 'regretful', name: '懊悔的過去' },
            { type: 'hopeful', name: '充滿希望的自己' },
            { type: 'angry', name: '憤怒的記憶' },
            { type: 'wise', name: '智慧的回響' },
            { type: 'fearful', name: '恐懼的陰影' }
        ];
        
        return personalities[Math.floor(Math.random() * personalities.length)];
    }

    // 獲取對話內容
    getDialogue() {
        const dialogues = {
            regretful: [
                "如果當時我做了不同的選擇...",
                "我後悔那個決定，但已經無法改變了。",
                "你能幫我修正這個錯誤嗎？"
            ],
            hopeful: [
                "未來還有希望，不要放棄！",
                "我相信你能找到正確的道路。",
                "讓我們一起創造更好的明天。"
            ],
            angry: [
                "為什麼要讓我經歷那些痛苦？",
                "我不會原諒那些傷害我們的人！",
                "憤怒讓我變得更強，但也更孤獨。"
            ],
            wise: [
                "時間教會了我很多東西。",
                "每個選擇都有其意義，即使是錯誤的。",
                "聽我說，這條路我走過..."
            ],
            fearful: [
                "我害怕再次面對那個時刻。",
                "黑暗中有什麼在等著我們？",
                "請不要讓我一個人..."
            ]
        };
        
        const typeDialogues = dialogues[this.personality.type] || dialogues.wise;
        return typeDialogues[Math.floor(Math.random() * typeDialogues.length)];
    }

    // 互動
    interact() {
        if (!this.dialogueShown) {
            this.dialogueShown = true;
            const dialogue = this.getDialogue();
            this.gameEngine.uiManager?.showDialogue(this.personality.name, dialogue);
            return true;
        }
        return false;
    }

    // 檢查是否過期
    isExpired() {
        return this.age >= this.maxAge;
    }

    // 檢查點擊
    isPointInside(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= 25; // 點擊半徑
    }

    // 狀態管理
    getState() {
        return {
            x: this.x,
            y: this.y,
            originalX: this.originalX,
            originalY: this.originalY,
            age: this.age,
            playerState: this.playerState,
            recordingData: this.recordingData,
            personality: this.personality,
            dialogueShown: this.dialogueShown
        };
    }

    async loadState(state) {
        this.x = state.x;
        this.y = state.y;
        this.originalX = state.originalX;
        this.originalY = state.originalY;
        this.age = state.age;
        this.playerState = state.playerState;
        this.recordingData = state.recordingData || [];
        this.personality = state.personality;
        this.dialogueShown = state.dialogueShown || false;
    }
}