// 存檔管理器 - 處理遊戲進度保存和載入
export class SaveManager {
    constructor() {
        this.storageKey = 'echo-trail-save';
        this.autoSaveKey = 'echo-trail-autosave';
        this.settingsKey = 'echo-trail-settings';
        this.maxSaveSlots = 5;
        this.autoSaveInterval = 30000; // 30秒自動保存
        this.autoSaveTimer = null;
        
        // 預設設定
        this.defaultSettings = {
            masterVolume: 0.7,
            sfxVolume: 0.7,
            bgmVolume: 0.5,
            textSpeed: 'normal',
            language: 'zh-TW',
            fullscreen: false,
            showTutorial: true
        };
        
        this.currentSettings = { ...this.defaultSettings };
    }

    async init() {
        console.log('💾 初始化存檔管理器');
        
        // 載入設定
        await this.loadSettings();
        
        // 檢查存檔完整性
        this.validateSaveData();
        
        // 開始自動保存
        this.startAutoSave();
        
        console.log('✅ 存檔管理器初始化完成');
    }

    // 遊戲存檔相關
    async saveGame(gameState, slotIndex = 0) {
        try {
            const saveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                gameState: gameState,
                playTime: gameState.gameTime || 0,
                chapter: gameState.currentChapter || 1,
                level: gameState.currentLevel || 1,
                echoCount: gameState.echoCount || 0,
                playerData: gameState.player || {},
                metadata: {
                    saveDate: new Date().toLocaleString('zh-TW'),
                    location: this.getLocationDescription(gameState),
                    screenshot: await this.captureScreenshot()
                }
            };

            const saveKey = `${this.storageKey}-slot-${slotIndex}`;
            localStorage.setItem(saveKey, JSON.stringify(saveData));
            
            // 更新存檔列表
            this.updateSaveList(slotIndex, saveData.metadata);
            
            console.log(`💾 遊戲已保存到插槽 ${slotIndex}`);
            return true;
            
        } catch (error) {
            console.error('❌ 保存遊戲失敗:', error);
            return false;
        }
    }

    async loadGame(slotIndex = 0) {
        try {
            const saveKey = `${this.storageKey}-slot-${slotIndex}`;
            const saveDataString = localStorage.getItem(saveKey);
            
            if (!saveDataString) {
                console.warn(`插槽 ${slotIndex} 沒有存檔`);
                return null;
            }
            
            const saveData = JSON.parse(saveDataString);
            
            // 驗證存檔版本
            if (!this.isCompatibleVersion(saveData.version)) {
                console.warn('存檔版本不相容');
                return null;
            }
            
            console.log(`📁 從插槽 ${slotIndex} 載入遊戲`);
            return saveData.gameState;
            
        } catch (error) {
            console.error('❌ 載入遊戲失敗:', error);
            return null;
        }
    }

    async deleteSave(slotIndex) {
        try {
            const saveKey = `${this.storageKey}-slot-${slotIndex}`;
            localStorage.removeItem(saveKey);
            
            // 更新存檔列表
            this.updateSaveList(slotIndex, null);
            
            console.log(`🗑️ 刪除插槽 ${slotIndex} 的存檔`);
            return true;
            
        } catch (error) {
            console.error('❌ 刪除存檔失敗:', error);
            return false;
        }
    }

    // 自動保存
    async autoSave(gameState) {
        try {
            const autoSaveData = {
                version: '1.0.0',
                timestamp: Date.now(),
                gameState: gameState,
                isAutoSave: true
            };
            
            localStorage.setItem(this.autoSaveKey, JSON.stringify(autoSaveData));
            console.log('💾 自動保存完成');
            
        } catch (error) {
            console.error('❌ 自動保存失敗:', error);
        }
    }

    async loadAutoSave() {
        try {
            const autoSaveString = localStorage.getItem(this.autoSaveKey);
            if (!autoSaveString) return null;
            
            const autoSaveData = JSON.parse(autoSaveString);
            
            // 檢查自動保存是否太舊（超過24小時）
            const age = Date.now() - autoSaveData.timestamp;
            if (age > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(this.autoSaveKey);
                return null;
            }
            
            return autoSaveData.gameState;
            
        } catch (error) {
            console.error('❌ 載入自動保存失敗:', error);
            return null;
        }
    }

    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            // 這裡需要從遊戲引擎獲取當前狀態
            // 在實際實現中，會通過回調或事件來獲取
            const event = new CustomEvent('requestAutoSave');
            document.dispatchEvent(event);
        }, this.autoSaveInterval);
    }

    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    // 設定管理
    async saveSettings(settings) {
        try {
            this.currentSettings = { ...this.currentSettings, ...settings };
            localStorage.setItem(this.settingsKey, JSON.stringify(this.currentSettings));
            console.log('⚙️ 設定已保存');
            return true;
            
        } catch (error) {
            console.error('❌ 保存設定失敗:', error);
            return false;
        }
    }

    async loadSettings() {
        try {
            const settingsString = localStorage.getItem(this.settingsKey);
            if (settingsString) {
                const savedSettings = JSON.parse(settingsString);
                this.currentSettings = { ...this.defaultSettings, ...savedSettings };
            }
            
            console.log('⚙️ 設定已載入');
            return this.currentSettings;
            
        } catch (error) {
            console.error('❌ 載入設定失敗:', error);
            this.currentSettings = { ...this.defaultSettings };
            return this.currentSettings;
        }
    }

    getSettings() {
        return { ...this.currentSettings };
    }

    // 存檔管理
    getSaveList() {
        const saveListString = localStorage.getItem(`${this.storageKey}-list`);
        if (!saveListString) {
            return Array(this.maxSaveSlots).fill(null);
        }
        
        try {
            return JSON.parse(saveListString);
        } catch (error) {
            console.error('❌ 載入存檔列表失敗:', error);
            return Array(this.maxSaveSlots).fill(null);
        }
    }

    updateSaveList(slotIndex, metadata) {
        const saveList = this.getSaveList();
        saveList[slotIndex] = metadata;
        localStorage.setItem(`${this.storageKey}-list`, JSON.stringify(saveList));
    }

    // 存檔資訊
    async getSaveInfo(slotIndex) {
        try {
            const saveKey = `${this.storageKey}-slot-${slotIndex}`;
            const saveDataString = localStorage.getItem(saveKey);
            
            if (!saveDataString) return null;
            
            const saveData = JSON.parse(saveDataString);
            return {
                exists: true,
                timestamp: saveData.timestamp,
                chapter: saveData.chapter,
                level: saveData.level,
                playTime: saveData.playTime,
                location: saveData.metadata?.location || '未知位置',
                saveDate: saveData.metadata?.saveDate || '未知時間',
                screenshot: saveData.metadata?.screenshot
            };
            
        } catch (error) {
            console.error(`❌ 獲取存檔 ${slotIndex} 資訊失敗:`, error);
            return null;
        }
    }

    // 工具方法
    getLocationDescription(gameState) {
        const chapter = gameState.currentChapter || 1;
        const level = gameState.currentLevel || 1;
        
        const chapterNames = {
            1: '第一章：殘影初醒',
            2: '第二章：記憶交錯',
            3: '第三章：重演無法改變的命運',
            4: '第四章：時序審判',
            5: '第五章：你，與我'
        };
        
        return `${chapterNames[chapter] || `第${chapter}章`} - 關卡 ${level}`;
    }

    async captureScreenshot() {
        try {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return null;
            
            // 創建縮略圖
            const thumbnailCanvas = document.createElement('canvas');
            const thumbnailCtx = thumbnailCanvas.getContext('2d');
            
            thumbnailCanvas.width = 160;
            thumbnailCanvas.height = 120;
            
            thumbnailCtx.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
            
            return thumbnailCanvas.toDataURL('image/jpeg', 0.7);
            
        } catch (error) {
            console.error('❌ 截圖失敗:', error);
            return null;
        }
    }

    isCompatibleVersion(version) {
        // 簡單的版本相容性檢查
        const currentVersion = '1.0.0';
        const [currentMajor] = currentVersion.split('.').map(Number);
        const [saveMajor] = version.split('.').map(Number);
        
        return currentMajor === saveMajor;
    }

    validateSaveData() {
        // 檢查並修復損壞的存檔
        for (let i = 0; i < this.maxSaveSlots; i++) {
            try {
                const saveKey = `${this.storageKey}-slot-${i}`;
                const saveDataString = localStorage.getItem(saveKey);
                
                if (saveDataString) {
                    JSON.parse(saveDataString); // 嘗試解析
                }
            } catch (error) {
                console.warn(`存檔插槽 ${i} 數據損壞，已清除`);
                localStorage.removeItem(`${this.storageKey}-slot-${i}`);
            }
        }
    }

    // 匯出/匯入功能
    async exportSave(slotIndex) {
        try {
            const saveKey = `${this.storageKey}-slot-${slotIndex}`;
            const saveDataString = localStorage.getItem(saveKey);
            
            if (!saveDataString) {
                throw new Error('存檔不存在');
            }
            
            const saveData = JSON.parse(saveDataString);
            const exportData = {
                ...saveData,
                exportDate: new Date().toISOString(),
                gameVersion: '1.0.0'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `echo-trail-save-${slotIndex}-${Date.now()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            console.log(`📤 存檔 ${slotIndex} 已匯出`);
            
        } catch (error) {
            console.error('❌ 匯出存檔失敗:', error);
            throw error;
        }
    }

    async importSave(file, slotIndex) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // 驗證匯入數據
            if (!importData.gameState || !importData.version) {
                throw new Error('無效的存檔文件');
            }
            
            if (!this.isCompatibleVersion(importData.version)) {
                throw new Error('存檔版本不相容');
            }
            
            // 保存到指定插槽
            const saveKey = `${this.storageKey}-slot-${slotIndex}`;
            localStorage.setItem(saveKey, JSON.stringify(importData));
            
            // 更新存檔列表
            this.updateSaveList(slotIndex, importData.metadata);
            
            console.log(`📥 存檔已匯入到插槽 ${slotIndex}`);
            return true;
            
        } catch (error) {
            console.error('❌ 匯入存檔失敗:', error);
            throw error;
        }
    }

    // 清理功能
    clearAllSaves() {
        for (let i = 0; i < this.maxSaveSlots; i++) {
            const saveKey = `${this.storageKey}-slot-${i}`;
            localStorage.removeItem(saveKey);
        }
        
        localStorage.removeItem(`${this.storageKey}-list`);
        localStorage.removeItem(this.autoSaveKey);
        
        console.log('🗑️ 所有存檔已清除');
    }

    resetSettings() {
        this.currentSettings = { ...this.defaultSettings };
        localStorage.removeItem(this.settingsKey);
        console.log('⚙️ 設定已重置');
    }

    // 統計資訊
    getStorageUsage() {
        let totalSize = 0;
        const usage = {};
        
        for (let i = 0; i < this.maxSaveSlots; i++) {
            const saveKey = `${this.storageKey}-slot-${i}`;
            const data = localStorage.getItem(saveKey);
            if (data) {
                const size = new Blob([data]).size;
                usage[`slot${i}`] = size;
                totalSize += size;
            }
        }
        
        const autoSaveData = localStorage.getItem(this.autoSaveKey);
        if (autoSaveData) {
            const size = new Blob([autoSaveData]).size;
            usage.autoSave = size;
            totalSize += size;
        }
        
        const settingsData = localStorage.getItem(this.settingsKey);
        if (settingsData) {
            const size = new Blob([settingsData]).size;
            usage.settings = size;
            totalSize += size;
        }
        
        return {
            total: totalSize,
            breakdown: usage,
            totalMB: (totalSize / 1024 / 1024).toFixed(2)
        };
    }

    // 清理資源
    dispose() {
        this.stopAutoSave();
        console.log('💾 存檔管理器已清理');
    }
}