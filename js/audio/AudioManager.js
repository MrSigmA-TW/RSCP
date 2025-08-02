// 音頻管理器 - 處理所有音效和背景音樂
export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.bgmGain = null;
        
        // 音量設置
        this.masterVolume = 0.7;
        this.sfxVolume = 0.7;
        this.bgmVolume = 0.5;
        
        // 音頻資源
        this.sounds = new Map();
        this.music = new Map();
        this.currentBGM = null;
        
        // 狀態
        this.isInitialized = false;
        this.isMuted = false;
        this.isEnabled = true;
        
        // 音頻文件路徑
        this.audioPath = 'assets/audio/';
        
        // 預定義音效列表
        this.soundList = {
            // UI音效
            'ui-select': { file: 'ui/select.mp3', volume: 0.6 },
            'ui-back': { file: 'ui/back.mp3', volume: 0.6 },
            'ui-error': { file: 'ui/error.mp3', volume: 0.8 },
            'screen-transition': { file: 'ui/transition.mp3', volume: 0.4 },
            
            // 遊戲音效
            'echo-create': { file: 'game/echo_create.mp3', volume: 0.8 },
            'echo-activate': { file: 'game/echo_activate.mp3', volume: 0.7 },
            'player-hurt': { file: 'game/player_hurt.mp3', volume: 0.9 },
            'player-death': { file: 'game/player_death.mp3', volume: 1.0 },
            'interact': { file: 'game/interact.mp3', volume: 0.6 },
            'pickup': { file: 'game/pickup.mp3', volume: 0.7 },
            'heal': { file: 'game/heal.mp3', volume: 0.8 },
            
            // 對話音效
            'dialogue-show': { file: 'dialogue/show.mp3', volume: 0.5 },
            'dialogue-hide': { file: 'dialogue/hide.mp3', volume: 0.4 },
            'typewriter': { file: 'dialogue/typewriter.mp3', volume: 0.3 },
            'choice-select': { file: 'dialogue/choice.mp3', volume: 0.6 },
            
            // 章節音效
            'chapter-start': { file: 'chapter/start.mp3', volume: 0.9 },
            'chapter-complete': { file: 'chapter/complete.mp3', volume: 1.0 },
            'level-complete': { file: 'chapter/level_complete.mp3', volume: 0.8 },
            
            // 環境音效
            'time-distortion': { file: 'ambient/time_distortion.mp3', volume: 0.4 },
            'echo-whisper': { file: 'ambient/echo_whisper.mp3', volume: 0.3 }
        };
        
        // 背景音樂列表
        this.musicList = {
            'title-theme': { file: 'bgm/title_theme.mp3', loop: true, volume: 0.6 },
            'chapter1-theme': { file: 'bgm/chapter1_theme.mp3', loop: true, volume: 0.5 },
            'chapter2-theme': { file: 'bgm/chapter2_theme.mp3', loop: true, volume: 0.5 },
            'echo-theme': { file: 'bgm/echo_theme.mp3', loop: true, volume: 0.4 },
            'boss-theme': { file: 'bgm/boss_theme.mp3', loop: true, volume: 0.7 },
            'ending-theme': { file: 'bgm/ending_theme.mp3', loop: false, volume: 0.8 }
        };
    }

    async init() {
        console.log('🔊 初始化音頻管理器');
        
        try {
            // 創建音頻上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 創建音量控制節點
            this.masterGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            this.bgmGain = this.audioContext.createGain();
            
            // 連接音頻圖
            this.sfxGain.connect(this.masterGain);
            this.bgmGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            // 設置初始音量
            this.updateVolumes();
            
            // 預載入關鍵音效（使用合成音效作為後備）
            await this.loadCriticalSounds();
            
            this.isInitialized = true;
            console.log('✅ 音頻管理器初始化完成');
            
        } catch (error) {
            console.warn('⚠️ 音頻初始化失敗，使用靜音模式:', error);
            this.isEnabled = false;
        }
    }

    async loadCriticalSounds() {
        // 由於我們沒有實際的音頻文件，創建合成音效
        const criticalSounds = ['ui-select', 'echo-create', 'player-hurt'];
        
        for (const soundName of criticalSounds) {
            try {
                const audioBuffer = this.createSyntheticSound(soundName);
                this.sounds.set(soundName, audioBuffer);
            } catch (error) {
                console.warn(`無法載入音效: ${soundName}`, error);
            }
        }
    }

    createSyntheticSound(soundName) {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        let duration, frequency, type;
        
        // 根據音效類型生成不同的合成音
        switch (soundName) {
            case 'ui-select':
                duration = 0.2;
                frequency = 800;
                type = 'sine';
                break;
            case 'echo-create':
                duration = 0.5;
                frequency = 400;
                type = 'triangle';
                break;
            case 'player-hurt':
                duration = 0.3;
                frequency = 200;
                type = 'sawtooth';
                break;
            default:
                duration = 0.1;
                frequency = 440;
                type = 'sine';
        }
        
        const frameCount = sampleRate * duration;
        const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // 生成音頻數據
        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            let sample = 0;
            
            switch (type) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * frequency * t);
                    break;
                case 'triangle':
                    sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
                    break;
                case 'sawtooth':
                    sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
                    break;
            }
            
            // 應用包絡（淡入淡出）
            const envelope = Math.exp(-t * 3); // 指數衰減
            channelData[i] = sample * envelope * 0.3; // 降低音量
        }
        
        return audioBuffer;
    }

    async loadSound(soundName) {
        if (this.sounds.has(soundName)) {
            return this.sounds.get(soundName);
        }
        
        const soundConfig = this.soundList[soundName];
        if (!soundConfig) {
            console.warn(`未知音效: ${soundName}`);
            return null;
        }
        
        try {
            // 嘗試載入實際音頻文件
            const response = await fetch(this.audioPath + soundConfig.file);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sounds.set(soundName, audioBuffer);
                return audioBuffer;
            }
        } catch (error) {
            console.warn(`載入音效失敗: ${soundName}, 使用合成音效`);
        }
        
        // 後備：創建合成音效
        const syntheticSound = this.createSyntheticSound(soundName);
        if (syntheticSound) {
            this.sounds.set(soundName, syntheticSound);
        }
        return syntheticSound;
    }

    async loadMusic(musicName) {
        if (this.music.has(musicName)) {
            return this.music.get(musicName);
        }
        
        const musicConfig = this.musicList[musicName];
        if (!musicConfig) {
            console.warn(`未知音樂: ${musicName}`);
            return null;
        }
        
        try {
            const audio = new Audio();
            audio.src = this.audioPath + musicConfig.file;
            audio.loop = musicConfig.loop;
            audio.volume = musicConfig.volume * this.bgmVolume;
            
            // 等待音頻載入
            await new Promise((resolve, reject) => {
                audio.addEventListener('canplaythrough', resolve);
                audio.addEventListener('error', reject);
                audio.load();
            });
            
            this.music.set(musicName, audio);
            return audio;
            
        } catch (error) {
            console.warn(`載入音樂失敗: ${musicName}`, error);
            return null;
        }
    }

    playSound(soundName, volume = 1.0) {
        if (!this.isEnabled || !this.audioContext || this.isMuted) {
            return;
        }
        
        const audioBuffer = this.sounds.get(soundName);
        if (!audioBuffer) {
            // 嘗試載入音效
            this.loadSound(soundName).then(buffer => {
                if (buffer) {
                    this.playSoundBuffer(buffer, volume);
                }
            });
            return;
        }
        
        this.playSoundBuffer(audioBuffer, volume);
    }

    playSoundBuffer(audioBuffer, volume = 1.0) {
        if (!this.audioContext || !audioBuffer) return;
        
        try {
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = audioBuffer;
            source.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            gainNode.gain.value = volume;
            source.start();
            
        } catch (error) {
            console.warn('播放音效失敗:', error);
        }
    }

    async playMusic(musicName, fadeIn = true) {
        if (!this.isEnabled || this.isMuted) {
            return;
        }
        
        // 停止當前音樂
        if (this.currentBGM) {
            if (fadeIn) {
                await this.fadeOutMusic(this.currentBGM);
            } else {
                this.currentBGM.pause();
            }
        }
        
        // 載入並播放新音樂
        const audio = await this.loadMusic(musicName);
        if (audio) {
            this.currentBGM = audio;
            
            if (fadeIn) {
                audio.volume = 0;
                audio.play();
                this.fadeInMusic(audio);
            } else {
                audio.volume = this.musicList[musicName].volume * this.bgmVolume;
                audio.play();
            }
        }
    }

    fadeInMusic(audio, duration = 2000) {
        const targetVolume = this.musicList[Object.keys(this.musicList).find(key => 
            this.musicList[key] === audio
        )]?.volume * this.bgmVolume || 0.5;
        
        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = targetVolume / steps;
        
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            audio.volume = Math.min(volumeStep * currentStep, targetVolume);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
            }
        }, stepTime);
    }

    fadeOutMusic(audio, duration = 1000) {
        return new Promise(resolve => {
            const initialVolume = audio.volume;
            const steps = 50;
            const stepTime = duration / steps;
            const volumeStep = initialVolume / steps;
            
            let currentStep = 0;
            const fadeInterval = setInterval(() => {
                currentStep++;
                audio.volume = Math.max(initialVolume - volumeStep * currentStep, 0);
                
                if (currentStep >= steps || audio.volume <= 0) {
                    clearInterval(fadeInterval);
                    audio.pause();
                    resolve();
                }
            }, stepTime);
        });
    }

    stopMusic() {
        if (this.currentBGM) {
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0;
            this.currentBGM = null;
        }
    }

    pauseAll() {
        if (this.currentBGM) {
            this.currentBGM.pause();
        }
        
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }

    resumeAll() {
        if (this.currentBGM) {
            this.currentBGM.play();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 音量控制
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }

    setBGMVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
        
        // 更新當前播放的音樂音量
        if (this.currentBGM) {
            const musicName = Object.keys(this.musicList).find(key => 
                this.music.get(key) === this.currentBGM
            );
            if (musicName) {
                this.currentBGM.volume = this.musicList[musicName].volume * this.bgmVolume;
            }
        }
    }

    updateVolumes() {
        if (!this.isInitialized) return;
        
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
        }
        
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
        
        if (this.bgmGain) {
            this.bgmGain.gain.value = this.bgmVolume;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.updateVolumes();
        return this.isMuted;
    }

    // 3D音效（未來擴展）
    playSound3D(soundName, x, y, listenerX, listenerY, maxDistance = 500) {
        const distance = Math.sqrt((x - listenerX) ** 2 + (y - listenerY) ** 2);
        const volume = Math.max(0, 1 - distance / maxDistance);
        
        if (volume > 0) {
            this.playSound(soundName, volume);
        }
    }

    // 音效預載入
    async preloadSounds(soundNames) {
        const promises = soundNames.map(name => this.loadSound(name));
        await Promise.all(promises);
        console.log(`🔊 預載入 ${soundNames.length} 個音效完成`);
    }

    async preloadMusic(musicNames) {
        const promises = musicNames.map(name => this.loadMusic(name));
        await Promise.all(promises);
        console.log(`🎵 預載入 ${musicNames.length} 首音樂完成`);
    }

    // 清理資源
    dispose() {
        this.stopMusic();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        this.sounds.clear();
        this.music.clear();
        
        console.log('🔊 音頻管理器已清理');
    }
}