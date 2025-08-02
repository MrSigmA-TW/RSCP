// UI管理器 - 處理所有用戶界面
export class UIManager {
    constructor() {
        this.gameManager = null;
        this.audioManager = null;
        this.saveManager = null;
        
        this.currentScreen = 'title-screen';
        this.isDialogueActive = false;
        this.currentDialogue = null;
        this.textSpeed = 'normal';
        this.textSpeeds = {
            slow: 50,
            normal: 30,
            fast: 10
        };
        
        // 對話系統
        this.dialogueQueue = [];
        this.isTyping = false;
        this.currentText = '';
        this.targetText = '';
        this.typewriterIndex = 0;
        this.typewriterTimer = 0;
        
        // UI元素引用
        this.elements = {};
        
        // 載入畫面
        this.loadingScreen = null;
        this.isLoading = false;
    }

    async init() {
        console.log('🖥️ 初始化UI管理器');
        
        // 獲取UI元素引用
        this.cacheElements();
        
        // 設置事件監聽器
        this.setupEventListeners();
        
        // 初始化對話系統
        this.initDialogueSystem();
        
        // 創建載入畫面
        this.createLoadingScreen();
    }

    setManagers(managers) {
        this.gameManager = managers.game;
        this.audioManager = managers.audio;
        this.saveManager = managers.save;
    }

    cacheElements() {
        // 畫面元素
        this.elements.titleScreen = document.getElementById('title-screen');
        this.elements.gameScreen = document.getElementById('game-screen');
        this.elements.settingsScreen = document.getElementById('settings-screen');
        
        // 遊戲UI元素
        this.elements.dialogueBox = document.getElementById('dialogue-box');
        this.elements.speakerName = document.getElementById('speaker-name');
        this.elements.dialogueText = document.getElementById('dialogue-text');
        this.elements.dialogueChoices = document.getElementById('dialogue-choices');
        this.elements.echoCount = document.getElementById('echo-count');
        this.elements.chapterTitle = document.getElementById('chapter-title');
        
        // 按鈕元素
        this.elements.createEchoBtn = document.getElementById('create-echo');
        this.elements.interactBtn = document.getElementById('interact');
        this.elements.menuBtn = document.getElementById('menu');
    }

    setupEventListeners() {
        // 對話框點擊事件
        if (this.elements.dialogueBox) {
            this.elements.dialogueBox.addEventListener('click', () => this.advanceDialogue());
        }
        
        // UI 專用鍵盤事件 - 只處理對話相關
        document.addEventListener('keydown', (e) => this.handleUIKeyDown(e));
        
        // 注意：Canvas 點擊事件由 InputHandler 統一處理，避免重複
        // 移除重複的 Canvas 事件監聽器以避免衝突
    }

    initDialogueSystem() {
        // 隱藏對話框
        if (this.elements.dialogueBox) {
            this.elements.dialogueBox.classList.add('hidden');
        }
    }

    createLoadingScreen() {
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.className = 'loading-screen';
        this.loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">載入中...</div>
            </div>
        `;
        
        this.loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .loading-content {
                text-align: center;
                color: #40e0d0;
            }
            
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid rgba(64, 224, 208, 0.3);
                border-top: 3px solid #40e0d0;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }
            
            .loading-text {
                font-size: 1.2rem;
                font-weight: bold;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.loadingScreen);
    }

    // 畫面切換
    async switchScreen(screenId) {
        console.log(`🖥️ 切換到畫面: ${screenId}`);
        
        // 隱藏當前畫面
        const currentScreenElement = document.getElementById(this.currentScreen);
        if (currentScreenElement) {
            currentScreenElement.classList.remove('active');
        }
        
        // 顯示新畫面
        const newScreenElement = document.getElementById(screenId);
        if (newScreenElement) {
            newScreenElement.classList.add('active');
            this.currentScreen = screenId;
        }
        
        // 播放切換音效
        this.audioManager?.playSound('screen-transition');
        
        // 等待動畫完成
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 載入畫面控制
    showLoadingScreen(text = '載入中...') {
        if (this.loadingScreen) {
            const textElement = this.loadingScreen.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = text;
            }
            
            this.loadingScreen.style.opacity = '1';
            this.loadingScreen.style.visibility = 'visible';
            this.isLoading = true;
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            this.loadingScreen.style.visibility = 'hidden';
            this.isLoading = false;
        }
    }

    // 對話系統
    showDialogue(speakerName, text, choices = null) {
        console.log(`💬 顯示對話: ${speakerName} - ${text}`);
        
        this.isDialogueActive = true;
        this.currentDialogue = { speakerName, text, choices };
        
        // 顯示對話框
        if (this.elements.dialogueBox) {
            this.elements.dialogueBox.classList.remove('hidden');
        }
        
        // 設置說話者名稱
        if (this.elements.speakerName) {
            this.elements.speakerName.textContent = speakerName;
        }
        
        // 開始打字機效果
        this.startTypewriter(text);
        
        // 處理選擇
        if (choices && this.elements.dialogueChoices) {
            this.showDialogueChoices(choices);
        } else if (this.elements.dialogueChoices) {
            this.elements.dialogueChoices.innerHTML = '';
        }
        
        // 播放對話音效
        this.audioManager?.playSound('dialogue-show');
    }

    startTypewriter(text) {
        this.targetText = text;
        this.currentText = '';
        this.typewriterIndex = 0;
        this.typewriterTimer = 0;
        this.isTyping = true;
        
        // 清空對話文字
        if (this.elements.dialogueText) {
            this.elements.dialogueText.textContent = '';
        }
        
        // 開始打字動畫
        this.updateTypewriter();
    }

    updateTypewriter() {
        if (!this.isTyping) return;
        
        const speed = this.textSpeeds[this.textSpeed];
        this.typewriterTimer += 16; // 假設60fps
        
        if (this.typewriterTimer >= speed) {
            if (this.typewriterIndex < this.targetText.length) {
                this.currentText += this.targetText[this.typewriterIndex];
                this.typewriterIndex++;
                
                if (this.elements.dialogueText) {
                    this.elements.dialogueText.textContent = this.currentText;
                }
                
                // 播放打字音效
                if (this.typewriterIndex % 3 === 0) {
                    this.audioManager?.playSound('typewriter', 0.3);
                }
            } else {
                this.isTyping = false;
            }
            
            this.typewriterTimer = 0;
        }
        
        if (this.isTyping) {
            requestAnimationFrame(() => this.updateTypewriter());
        }
    }

    showDialogueChoices(choices) {
        if (!this.elements.dialogueChoices) return;
        
        this.elements.dialogueChoices.innerHTML = '';
        
        choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.className = 'choice-btn';
            button.textContent = choice.text;
            button.addEventListener('click', () => this.selectChoice(choice, index));
            this.elements.dialogueChoices.appendChild(button);
        });
    }

    selectChoice(choice, index) {
        console.log(`🎯 選擇: ${choice.text}`);
        
        // 播放選擇音效
        this.audioManager?.playSound('choice-select');
        
        // 執行選擇回調
        if (choice.callback) {
            choice.callback();
        }
        
        // 隱藏對話
        this.hideDialogue();
    }

    advanceDialogue() {
        if (this.isTyping) {
            // 如果正在打字，立即完成
            this.completeTypewriter();
        } else if (this.isDialogueActive && !this.currentDialogue.choices) {
            // 如果沒有選擇，隱藏對話
            this.hideDialogue();
        }
    }

    completeTypewriter() {
        this.isTyping = false;
        this.currentText = this.targetText;
        
        if (this.elements.dialogueText) {
            this.elements.dialogueText.textContent = this.currentText;
        }
    }

    hideDialogue() {
        this.isDialogueActive = false;
        this.currentDialogue = null;
        
        if (this.elements.dialogueBox) {
            this.elements.dialogueBox.classList.add('hidden');
        }
        
        // 播放隱藏音效
        this.audioManager?.playSound('dialogue-hide');
    }

    // 章節標題顯示
    showChapterTitle(title) {
        const titleElement = document.createElement('div');
        titleElement.className = 'chapter-title-overlay';
        titleElement.innerHTML = `
            <div class="chapter-title-content">
                <h2>${title}</h2>
            </div>
        `;
        
        titleElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: chapterTitleFade 3s ease-in-out forwards;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .chapter-title-content h2 {
                color: #40e0d0;
                font-size: 3rem;
                text-align: center;
                text-shadow: 0 0 20px rgba(64, 224, 208, 0.5);
                animation: chapterTitleGlow 2s ease-in-out infinite alternate;
            }
            
            @keyframes chapterTitleFade {
                0% { opacity: 0; }
                20% { opacity: 1; }
                80% { opacity: 1; }
                100% { opacity: 0; visibility: hidden; }
            }
            
            @keyframes chapterTitleGlow {
                0% { text-shadow: 0 0 20px rgba(64, 224, 208, 0.5); }
                100% { text-shadow: 0 0 30px rgba(64, 224, 208, 0.8); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(titleElement);
        
        // 3秒後移除
        setTimeout(() => {
            if (titleElement.parentNode) {
                titleElement.parentNode.removeChild(titleElement);
            }
        }, 3000);
    }

    // 遊戲選單
    showGameMenu() {
        const menu = document.createElement('div');
        menu.className = 'game-menu-overlay';
        menu.innerHTML = `
            <div class="game-menu-content">
                <h3>遊戲選單</h3>
                <button class="menu-btn" id="resume-game">繼續遊戲</button>
                <button class="menu-btn" id="save-game">保存遊戲</button>
                <button class="menu-btn" id="load-game-menu">載入遊戲</button>
                <button class="menu-btn" id="settings-menu">設定</button>
                <button class="menu-btn" id="quit-game">退出遊戲</button>
            </div>
        `;
        
        menu.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        // 綁定事件
        menu.addEventListener('click', (e) => {
            if (e.target.id === 'resume-game' || e.target === menu) {
                this.hideGameMenu(menu);
            } else if (e.target.id === 'save-game') {
                this.saveGame();
                this.hideGameMenu(menu);
            }
            // 其他按鈕處理...
        });
        
        document.body.appendChild(menu);
        
        // 暫停遊戲
        if (this.gameManager) {
            this.gameManager.pauseGame();
        }
    }

    hideGameMenu(menu) {
        if (menu && menu.parentNode) {
            menu.parentNode.removeChild(menu);
        }
        
        // 恢復遊戲
        if (this.gameManager) {
            this.gameManager.resumeGame();
        }
    }

    // 事件處理
    handleCanvasClick(event) {
        if (!this.gameManager || this.isDialogueActive) return;
        
        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // 檢查是否點擊了殘影
        const echoSystem = this.gameManager.echoSystem;
        if (echoSystem) {
            const clickedEcho = echoSystem.echoes.find(echo => echo.isPointInside(x, y));
            if (clickedEcho) {
                clickedEcho.interact();
                return;
            }
        }
        
        // 其他點擊處理...
    }

    handleCanvasMouseMove(event) {
        // 滑鼠懸停效果
        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // 檢查是否懸停在可互動物件上
        let cursor = 'default';
        
        if (this.gameManager && this.gameManager.echoSystem) {
            const hoveredEcho = this.gameManager.echoSystem.echoes.find(echo => echo.isPointInside(x, y));
            if (hoveredEcho) {
                cursor = 'pointer';
            }
        }
        
        canvas.style.cursor = cursor;
    }

    handleUIKeyDown(event) {
        // 只處理 UI 相關的鍵盤事件，避免與其他系統衝突
        if (this.isDialogueActive) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.advanceDialogue();
            }
        }
    }

    // 工具方法
    showMessage(message, duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ui-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(64, 224, 208, 0.9);
            color: #000;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 5000;
            font-weight: bold;
            animation: messageSlideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'messageSlideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, duration);
    }

    showLevelComplete() {
        this.showMessage('關卡完成！', 2000);
    }

    showChapterComplete() {
        this.showMessage('章節完成！', 3000);
    }

    showGameOver() {
        this.showMessage('遊戲結束', 5000);
    }

    showMemoryFragment(memory) {
        this.showDialogue('記憶碎片', memory.text);
    }

    setTextSpeed(speed) {
        this.textSpeed = speed;
    }

    async saveGame() {
        if (this.gameManager && this.saveManager) {
            const gameState = this.gameManager.getGameState();
            await this.saveManager.saveGame(gameState);
            this.showMessage('遊戲已保存');
        }
    }
}