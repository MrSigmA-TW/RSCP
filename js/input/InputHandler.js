// 輸入處理器 - 處理鍵盤、滑鼠和觸控輸入
export class InputHandler {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // 鍵盤狀態
        this.keys = new Map();
        this.keyBindings = {
            // 移動控制
            'w': 'up',
            'a': 'left', 
            's': 'down',
            'd': 'right',
            'ArrowUp': 'up',
            'ArrowLeft': 'left',
            'ArrowDown': 'down',
            'ArrowRight': 'right',
            
            // 行動控制
            'e': 'interact',
            'q': 'createEcho',
            ' ': 'createEcho', // 空白鍵
            'Enter': 'confirm',
            'Escape': 'menu',
            
            // 快捷鍵
            'r': 'restart',
            'p': 'pause',
            'm': 'mute',
            'f': 'fullscreen'
        };
        
        // 滑鼠狀態
        this.mouse = {
            x: 0,
            y: 0,
            leftButton: false,
            rightButton: false,
            middleButton: false,
            wheel: 0
        };
        
        // 觸控狀態
        this.touch = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            deltaX: 0,
            deltaY: 0
        };
        
        // 輸入緩衝
        this.inputBuffer = [];
        this.bufferSize = 10;
        this.bufferTime = 0.1; // 100ms
        
        // 組合鍵
        this.combos = new Map();
        this.comboTimeout = 1000; // 1秒
        
        // 事件監聽器
        this.boundHandlers = {
            keydown: this.handleKeyDown.bind(this),
            keyup: this.handleKeyUp.bind(this),
            mousedown: this.handleMouseDown.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            wheel: this.handleWheel.bind(this),
            touchstart: this.handleTouchStart.bind(this),
            touchmove: this.handleTouchMove.bind(this),
            touchend: this.handleTouchEnd.bind(this),
            contextmenu: this.handleContextMenu.bind(this)
        };
        
        // 防止重複觸發
        this.lastActionTime = new Map();
        this.actionCooldown = 100; // 100ms
    }

    async init() {
        console.log('🎮 初始化輸入處理器');
        
        // 綁定事件監聽器
        this.bindEventListeners();
        
        // 設置組合鍵
        this.setupCombos();
        
        // 檢測輸入設備
        this.detectInputDevices();
    }

    bindEventListeners() {
        // 鍵盤事件
        document.addEventListener('keydown', this.boundHandlers.keydown);
        document.addEventListener('keyup', this.boundHandlers.keyup);
        
        // 滑鼠事件
        const canvas = this.gameEngine.canvas;
        if (canvas) {
            canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
            canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
            canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
            canvas.addEventListener('wheel', this.boundHandlers.wheel);
            canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
        }
        
        // 觸控事件
        if (canvas) {
            canvas.addEventListener('touchstart', this.boundHandlers.touchstart, { passive: false });
            canvas.addEventListener('touchmove', this.boundHandlers.touchmove, { passive: false });
            canvas.addEventListener('touchend', this.boundHandlers.touchend, { passive: false });
        }
        
        // 防止預設行為
        document.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
    }

    setupCombos() {
        // 設置組合鍵
        this.combos.set('ctrl+s', () => this.gameEngine.saveManager?.saveGame());
        this.combos.set('ctrl+l', () => this.gameEngine.saveManager?.loadGame());
        this.combos.set('ctrl+r', () => this.restartLevel());
        this.combos.set('alt+enter', () => this.toggleFullscreen());
    }

    detectInputDevices() {
        // 檢測可用的輸入設備
        const hasTouch = 'ontouchstart' in window;
        const hasGamepad = 'getGamepads' in navigator;
        
        console.log(`🎮 輸入設備: 觸控=${hasTouch}, 手把=${hasGamepad}`);
    }

    update(deltaTime) {
        // 更新輸入緩衝
        this.updateInputBuffer(deltaTime);
        
        // 處理持續按鍵
        this.processContinuousInput();
        
        // 檢查手把輸入
        this.checkGamepadInput();
        
        // 清理過期的組合鍵
        this.cleanupCombos();
    }

    updateInputBuffer(deltaTime) {
        // 移除過期的輸入
        const currentTime = performance.now();
        this.inputBuffer = this.inputBuffer.filter(input => 
            currentTime - input.timestamp < this.bufferTime * 1000
        );
    }

    processContinuousInput() {
        const player = this.gameEngine.player;
        if (!player) return;
        
        // 重置輸入狀態
        player.setInputState('up', false);
        player.setInputState('down', false);
        player.setInputState('left', false);
        player.setInputState('right', false);
        
        // 處理當前按下的鍵
        for (const [key, action] of Object.entries(this.keyBindings)) {
            if (this.isKeyPressed(key)) {
                switch (action) {
                    case 'up':
                    case 'down':
                    case 'left':
                    case 'right':
                        player.setInputState(action, true);
                        break;
                }
            }
        }
    }

    checkGamepadInput() {
        if (!('getGamepads' in navigator)) return;
        
        const gamepads = navigator.getGamepads();
        for (const gamepad of gamepads) {
            if (gamepad) {
                this.processGamepadInput(gamepad);
            }
        }
    }

    processGamepadInput(gamepad) {
        const player = this.gameEngine.player;
        if (!player) return;
        
        // 左搖桿移動
        const leftStickX = gamepad.axes[0];
        const leftStickY = gamepad.axes[1];
        const deadzone = 0.2;
        
        if (Math.abs(leftStickX) > deadzone) {
            player.setInputState('left', leftStickX < -deadzone);
            player.setInputState('right', leftStickX > deadzone);
        }
        
        if (Math.abs(leftStickY) > deadzone) {
            player.setInputState('up', leftStickY < -deadzone);
            player.setInputState('down', leftStickY > deadzone);
        }
        
        // 按鈕
        if (gamepad.buttons[0].pressed) { // A按鈕
            this.triggerAction('interact');
        }
        
        if (gamepad.buttons[1].pressed) { // B按鈕
            this.triggerAction('createEcho');
        }
    }

    cleanupCombos() {
        // 清理過期的組合鍵狀態
        const currentTime = performance.now();
        for (const [combo, data] of this.combos) {
            if (data.lastPressed && currentTime - data.lastPressed > this.comboTimeout) {
                data.keys = [];
            }
        }
    }

    // 鍵盤事件處理
    handleKeyDown(event) {
        const key = event.key;
        this.keys.set(key, true);
        
        // 添加到輸入緩衝
        this.addToInputBuffer('keydown', key);
        
        // 檢查組合鍵
        this.checkCombos(event);
        
        // 處理單次按鍵動作
        const action = this.keyBindings[key];
        if (action) {
            this.triggerAction(action, event);
        }
        
        // 阻止某些按鍵的預設行為
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.code)) {
            event.preventDefault();
        }
    }

    handleKeyUp(event) {
        const key = event.key;
        this.keys.set(key, false);
        
        this.addToInputBuffer('keyup', key);
    }

    // 滑鼠事件處理
    handleMouseDown(event) {
        this.updateMousePosition(event);
        
        switch (event.button) {
            case 0: // 左鍵
                this.mouse.leftButton = true;
                this.handleMouseClick(event);
                break;
            case 1: // 中鍵
                this.mouse.middleButton = true;
                break;
            case 2: // 右鍵
                this.mouse.rightButton = true;
                this.handleRightClick(event);
                break;
        }
        
        this.addToInputBuffer('mousedown', { button: event.button, x: this.mouse.x, y: this.mouse.y });
    }

    handleMouseUp(event) {
        switch (event.button) {
            case 0:
                this.mouse.leftButton = false;
                break;
            case 1:
                this.mouse.middleButton = false;
                break;
            case 2:
                this.mouse.rightButton = false;
                break;
        }
        
        this.addToInputBuffer('mouseup', { button: event.button, x: this.mouse.x, y: this.mouse.y });
    }

    handleMouseMove(event) {
        this.updateMousePosition(event);
    }

    handleWheel(event) {
        this.mouse.wheel = event.deltaY;
        this.addToInputBuffer('wheel', { delta: event.deltaY, x: this.mouse.x, y: this.mouse.y });
        
        // 處理滾輪縮放等
        event.preventDefault();
    }

    handleMouseClick(event) {
        // 檢查是否點擊了殘影
        const echoSystem = this.gameEngine.echoSystem;
        if (echoSystem) {
            const clickedEcho = echoSystem.echoes.find(echo => 
                echo.isPointInside(this.mouse.x, this.mouse.y)
            );
            
            if (clickedEcho) {
                clickedEcho.interact();
                this.gameEngine.audioManager?.playSound('echo-activate');
                return;
            }
        }
        
        // 檢查是否點擊了可互動物件
        const levelManager = this.gameEngine.levelManager;
        if (levelManager) {
            const interactable = levelManager.getInteractableAt(this.mouse.x, this.mouse.y);
            if (interactable) {
                interactable.interact(this.gameEngine.player);
                return;
            }
        }
    }

    handleRightClick(event) {
        // 右鍵創建殘影
        this.triggerAction('createEcho');
        event.preventDefault();
    }

    handleContextMenu(event) {
        event.preventDefault(); // 防止右鍵選單
    }

    // 觸控事件處理
    handleTouchStart(event) {
        event.preventDefault();
        
        const touch = event.touches[0];
        this.touch.active = true;
        this.touch.startX = touch.clientX;
        this.touch.startY = touch.clientY;
        this.touch.currentX = touch.clientX;
        this.touch.currentY = touch.clientY;
        
        this.addToInputBuffer('touchstart', { 
            x: this.touch.currentX, 
            y: this.touch.currentY 
        });
    }

    handleTouchMove(event) {
        event.preventDefault();
        
        if (!this.touch.active) return;
        
        const touch = event.touches[0];
        this.touch.currentX = touch.clientX;
        this.touch.currentY = touch.clientY;
        this.touch.deltaX = this.touch.currentX - this.touch.startX;
        this.touch.deltaY = this.touch.currentY - this.touch.startY;
        
        // 處理觸控移動作為方向輸入
        this.processTouchMovement();
    }

    handleTouchEnd(event) {
        event.preventDefault();
        
        if (!this.touch.active) return;
        
        // 檢查是否為點擊（移動距離很小）
        const distance = Math.sqrt(this.touch.deltaX ** 2 + this.touch.deltaY ** 2);
        if (distance < 20) {
            this.handleTouchTap();
        }
        
        this.touch.active = false;
        this.touch.deltaX = 0;
        this.touch.deltaY = 0;
        
        this.addToInputBuffer('touchend', { 
            x: this.touch.currentX, 
            y: this.touch.currentY 
        });
    }

    processTouchMovement() {
        const player = this.gameEngine.player;
        if (!player) return;
        
        const threshold = 30;
        
        // 重置移動狀態
        player.setInputState('up', false);
        player.setInputState('down', false);
        player.setInputState('left', false);
        player.setInputState('right', false);
        
        // 根據觸控移動設置方向
        if (Math.abs(this.touch.deltaX) > threshold) {
            player.setInputState('left', this.touch.deltaX < -threshold);
            player.setInputState('right', this.touch.deltaX > threshold);
        }
        
        if (Math.abs(this.touch.deltaY) > threshold) {
            player.setInputState('up', this.touch.deltaY < -threshold);
            player.setInputState('down', this.touch.deltaY > threshold);
        }
    }

    handleTouchTap() {
        // 觸控點擊處理
        const canvas = this.gameEngine.canvas;
        const rect = canvas.getBoundingClientRect();
        const x = this.touch.currentX - rect.left;
        const y = this.touch.currentY - rect.top;
        
        // 模擬滑鼠點擊
        this.mouse.x = x;
        this.mouse.y = y;
        this.handleMouseClick({ button: 0 });
    }

    // 工具方法
    updateMousePosition(event) {
        const canvas = this.gameEngine.canvas;
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = event.clientX - rect.left;
        this.mouse.y = event.clientY - rect.top;
    }

    addToInputBuffer(type, data) {
        this.inputBuffer.push({
            type: type,
            data: data,
            timestamp: performance.now()
        });
        
        // 限制緩衝區大小
        if (this.inputBuffer.length > this.bufferSize) {
            this.inputBuffer.shift();
        }
    }

    checkCombos(event) {
        const keys = [];
        if (event.ctrlKey) keys.push('ctrl');
        if (event.altKey) keys.push('alt');
        if (event.shiftKey) keys.push('shift');
        keys.push(event.key.toLowerCase());
        
        const combo = keys.join('+');
        const comboHandler = this.combos.get(combo);
        
        if (comboHandler) {
            comboHandler();
            event.preventDefault();
        }
    }

    triggerAction(action, event = null) {
        // 防止重複觸發
        const currentTime = performance.now();
        const lastTime = this.lastActionTime.get(action) || 0;
        
        if (currentTime - lastTime < this.actionCooldown) {
            return;
        }
        
        this.lastActionTime.set(action, currentTime);
        
        // 執行動作
        switch (action) {
            case 'interact':
                this.gameEngine.interact();
                break;
                
            case 'createEcho':
                this.gameEngine.createEcho();
                break;
                
            case 'confirm':
                if (this.gameEngine.uiManager?.isDialogueActive) {
                    this.gameEngine.uiManager.advanceDialogue();
                }
                break;
                
            case 'menu':
                this.gameEngine.uiManager?.showGameMenu();
                break;
                
            case 'pause':
                this.togglePause();
                break;
                
            case 'restart':
                this.restartLevel();
                break;
                
            case 'mute':
                this.gameEngine.audioManager?.toggleMute();
                break;
                
            case 'fullscreen':
                this.toggleFullscreen();
                break;
        }
    }

    // 狀態查詢
    isKeyPressed(key) {
        return this.keys.get(key) || false;
    }

    isMouseButtonPressed(button) {
        switch (button) {
            case 0: return this.mouse.leftButton;
            case 1: return this.mouse.middleButton;
            case 2: return this.mouse.rightButton;
            default: return false;
        }
    }

    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }

    getTouchPosition() {
        return { 
            x: this.touch.currentX, 
            y: this.touch.currentY,
            active: this.touch.active
        };
    }

    // 遊戲控制
    togglePause() {
        if (this.gameEngine.gameState.isPaused) {
            this.gameEngine.resumeGame();
        } else {
            this.gameEngine.pauseGame();
        }
    }

    restartLevel() {
        console.log('🔄 重新開始關卡');
        this.gameEngine.levelManager?.loadLevel(
            this.gameEngine.gameState.currentChapter,
            this.gameEngine.gameState.currentLevel
        );
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // 自定義鍵位綁定
    setKeyBinding(key, action) {
        this.keyBindings[key] = action;
        console.log(`🎮 設置鍵位綁定: ${key} -> ${action}`);
    }

    removeKeyBinding(key) {
        delete this.keyBindings[key];
        console.log(`🎮 移除鍵位綁定: ${key}`);
    }

    getKeyBindings() {
        return { ...this.keyBindings };
    }

    // 輸入歷史
    getInputHistory(duration = 1000) {
        const currentTime = performance.now();
        return this.inputBuffer.filter(input => 
            currentTime - input.timestamp < duration
        );
    }

    // 清理
    dispose() {
        // 移除事件監聽器
        document.removeEventListener('keydown', this.boundHandlers.keydown);
        document.removeEventListener('keyup', this.boundHandlers.keyup);
        
        const canvas = this.gameEngine.canvas;
        if (canvas) {
            canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
            canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
            canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
            canvas.removeEventListener('wheel', this.boundHandlers.wheel);
            canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
            canvas.removeEventListener('touchstart', this.boundHandlers.touchstart);
            canvas.removeEventListener('touchmove', this.boundHandlers.touchmove);
            canvas.removeEventListener('touchend', this.boundHandlers.touchend);
        }
        
        console.log('🎮 輸入處理器已清理');
    }
}

// 導出 InputHandler 類別供其他模組使用
// 注意：不導出全域實例，因為 InputHandler 需要 gameEngine 參數