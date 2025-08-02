// 主要遊戲入口點
import { GameEngine } from './core/GameEngine.js';
import { UIManager } from './ui/UIManager.js';
import { AudioManager } from './audio/AudioManager.js';
import { SaveManager } from './save/SaveManager.js';

class EchoTrailGame {
    constructor() {
        this.gameEngine = null;
        this.uiManager = null;
        this.audioManager = null;
        this.saveManager = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🎮 初始化《時影雙行 Echo Trail》...');
            
            // 初始化各個管理器
            this.audioManager = new AudioManager();
            this.saveManager = new SaveManager();
            this.uiManager = new UIManager();
            this.gameEngine = new GameEngine();

            // 設置管理器之間的引用
            this.gameEngine.setManagers({
                ui: this.uiManager,
                audio: this.audioManager,
                save: this.saveManager
            });

            this.uiManager.setManagers({
                game: this.gameEngine,
                audio: this.audioManager,
                save: this.saveManager
            });

            // 初始化所有系統
            await this.audioManager.init();
            await this.saveManager.init();
            await this.uiManager.init();
            await this.gameEngine.init();

            // 綁定事件監聽器
            this.bindEvents();

            this.isInitialized = true;
            console.log('✅ 遊戲初始化完成');

        } catch (error) {
            console.error('❌ 遊戲初始化失敗:', error);
            this.showErrorMessage('遊戲初始化失敗，請重新整理頁面');
        }
    }

    bindEvents() {
        // 標題畫面按鈕事件
        const startBtn = document.getElementById('start-game');
        const loadBtn = document.getElementById('load-game');
        const settingsBtn = document.getElementById('settings');
        const backToTitleBtn = document.getElementById('back-to-title');

        if (startBtn) {
            startBtn.addEventListener('click', () => this.startNewGame());
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.loadGame());
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }

        if (backToTitleBtn) {
            backToTitleBtn.addEventListener('click', () => this.backToTitle());
        }

        // 遊戲內按鈕事件
        const createEchoBtn = document.getElementById('create-echo');
        const interactBtn = document.getElementById('interact');
        const menuBtn = document.getElementById('menu');

        if (createEchoBtn) {
            createEchoBtn.addEventListener('click', () => this.gameEngine.createEcho());
        }

        if (interactBtn) {
            interactBtn.addEventListener('click', () => this.gameEngine.interact());
        }

        if (menuBtn) {
            menuBtn.addEventListener('click', () => this.showGameMenu());
        }

        // 鍵盤事件 - 只在遊戲畫面時處理
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // 視窗事件
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('beforeunload', () => this.handleBeforeUnload());

        // 設定控制項事件
        this.bindSettingsEvents();
    }

    bindSettingsEvents() {
        const sfxVolumeSlider = document.getElementById('sfx-volume');
        const bgmVolumeSlider = document.getElementById('bgm-volume');
        const textSpeedSelect = document.getElementById('text-speed');

        if (sfxVolumeSlider) {
            sfxVolumeSlider.addEventListener('input', (e) => {
                this.audioManager.setSFXVolume(e.target.value / 100);
            });
        }

        if (bgmVolumeSlider) {
            bgmVolumeSlider.addEventListener('input', (e) => {
                this.audioManager.setBGMVolume(e.target.value / 100);
            });
        }

        if (textSpeedSelect) {
            textSpeedSelect.addEventListener('change', (e) => {
                this.uiManager.setTextSpeed(e.target.value);
            });
        }
    }

    async startNewGame() {
        try {
            console.log('🚀 開始新遊戲');
            this.audioManager.playSound('ui-select');
            
            // 顯示載入畫面
            this.uiManager.showLoadingScreen('正在進入納赫拉姆...');
            
            // 切換到遊戲畫面
            await this.uiManager.switchScreen('game-screen');
            
            // 開始第一章
            await this.gameEngine.startChapter(1);
            
            this.uiManager.hideLoadingScreen();
            
        } catch (error) {
            console.error('❌ 開始新遊戲失敗:', error);
            this.showErrorMessage('無法開始新遊戲');
        }
    }

    async loadGame() {
        try {
            console.log('📁 載入遊戲');
            this.audioManager.playSound('ui-select');
            
            const saveData = await this.saveManager.loadGame();
            if (saveData) {
                this.uiManager.showLoadingScreen('正在載入進度...');
                await this.uiManager.switchScreen('game-screen');
                await this.gameEngine.loadGameState(saveData);
                this.uiManager.hideLoadingScreen();
            } else {
                this.uiManager.showMessage('沒有找到存檔');
            }
            
        } catch (error) {
            console.error('❌ 載入遊戲失敗:', error);
            this.showErrorMessage('載入遊戲失敗');
        }
    }

    showSettings() {
        console.log('⚙️ 顯示設定');
        this.audioManager.playSound('ui-select');
        this.uiManager.switchScreen('settings-screen');
    }

    backToTitle() {
        console.log('🏠 返回主選單');
        this.audioManager.playSound('ui-back');
        this.uiManager.switchScreen('title-screen');
    }

    showGameMenu() {
        console.log('📋 顯示遊戲選單');
        this.uiManager.showGameMenu();
    }

    handleKeyDown(event) {
        if (!this.isInitialized) return;

        const key = event.key.toLowerCase();
        
        // 全域快捷鍵
        switch (key) {
            case 'escape':
                event.preventDefault();
                if (this.uiManager.currentScreen === 'game-screen') {
                    this.showGameMenu();
                } else {
                    this.backToTitle();
                }
                break;
                
            case 'f11':
                event.preventDefault();
                this.toggleFullscreen();
                break;
        }

        // 遊戲內快捷鍵 - 讓 InputHandler 處理
        if (this.uiManager.currentScreen === 'game-screen' && this.gameEngine && this.gameEngine.inputHandler) {
            // InputHandler 已經有自己的事件監聽器，不需要重複處理
            // 這裡只處理全局快捷鍵
        }
    }

    handleKeyUp(event) {
        if (!this.isInitialized) return;
        
        if (this.uiManager.currentScreen === 'game-screen' && this.gameEngine && this.gameEngine.inputHandler) {
            // InputHandler 已經有自己的事件監聽器，不需要重複處理
        }
    }

    handleResize() {
        if (this.gameEngine) {
            this.gameEngine.handleResize();
        }
    }

    handleBeforeUnload() {
        // 自動保存
        if (this.gameEngine && this.gameEngine.isGameActive()) {
            this.saveManager.autoSave(this.gameEngine.getGameState());
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 1.2rem;
            text-align: center;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    // 公開方法供外部調用
    getGameEngine() {
        return this.gameEngine;
    }

    getUIManager() {
        return this.uiManager;
    }

    getAudioManager() {
        return this.audioManager;
    }

    getSaveManager() {
        return this.saveManager;
    }
}

// 全域遊戲實例
let gameInstance = null;

// 當頁面載入完成時初始化遊戲
document.addEventListener('DOMContentLoaded', async () => {
    try {
        gameInstance = new EchoTrailGame();
        await gameInstance.init();
        
        // 將遊戲實例暴露到全域作用域供調試使用
        window.EchoTrail = gameInstance;
        
    } catch (error) {
        console.error('❌ 遊戲啟動失敗:', error);
    }
});

// 導出遊戲類別供其他模組使用
export { EchoTrailGame };