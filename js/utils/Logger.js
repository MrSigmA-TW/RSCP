// 統一的日誌系統 - 支持調試模式控制
export class Logger {
    static isDebugMode() {
        return window.location.search.includes('debug=true');
    }
    
    static log(message, emoji = '📝') {
        if (this.isDebugMode()) {
            console.log(`${emoji} ${message}`);
        }
    }
    
    static info(message) {
        this.log(message, 'ℹ️');
    }
    
    static success(message) {
        this.log(message, '✅');
    }
    
    static warning(message) {
        this.log(message, '⚠️');
    }
    
    static error(message) {
        // 錯誤信息總是顯示
        console.error(`❌ ${message}`);
    }
    
    static game(message) {
        this.log(message, '🎮');
    }
    
    static audio(message) {
        this.log(message, '🔊');
    }
    
    static ui(message) {
        this.log(message, '🖥️');
    }
    
    static physics(message) {
        this.log(message, '⚡');
    }
    
    static save(message) {
        this.log(message, '💾');
    }
    
    static echo(message) {
        this.log(message, '👻');
    }
    
    static level(message) {
        this.log(message, '🗺️');
    }
    
    static player(message) {
        this.log(message, '👤');
    }
    
    static input(message) {
        this.log(message, '🎮');
    }
}