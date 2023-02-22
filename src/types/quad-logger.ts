export type QuadLoggerLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'none';

export type QuadLoggerOptions = {
    preface?: (logger: QuadLogger) => string;
    level?: QuadLoggerLevel;
}

export class QuadLogger {
    private readonly _preface: (logger: QuadLogger) => string;
    private _level: QuadLoggerLevel;

    constructor(options: QuadLoggerOptions) {
        this._preface = options.preface;
        this._level = options.level ?? 'warn';
    }

    get level(): QuadLoggerLevel {
        return this._level
    }

    setLevel(lvl: QuadLoggerLevel): this {
        this._level = lvl;
        return this;
    }

    log(level: QuadLoggerLevel, ...data: Array<any>): this {
        if (this.shouldLog(level)) {
            let logFunction: (...args: Array<any>) => void;
            switch (level) {
                case 'debug':
                    logFunction = console.debug;
                    break;
                case 'error':
                    logFunction = console.error;
                    break;
                case 'info':
                    logFunction = console.info;
                    break;
                case 'trace':
                    logFunction = console.trace;
                    break;
                case 'warn':
                    logFunction = console.warn;
                    break;
                case 'none':
                default:
                    return this;
            }
            if (this._preface) {
                try {
                    data.unshift(this._preface(this));
                } catch (e) {
                    console.warn('error calling preface function', e);
                }
            }
            logFunction(...data);
        }
    }

    shouldLog(level: QuadLoggerLevel): boolean {
        const allowed = new Array<QuadLoggerLevel>();
        switch (this._level) {
            case 'trace':
                allowed.push('trace');
            case 'debug':
                allowed.push('debug');
            case 'info':
                allowed.push('info');
            case 'warn':
                allowed.push('warn');
            case 'error':
                allowed.push('error');
            case 'none':
            default:
                break;
        }
        return allowed.includes(level);
    }
}