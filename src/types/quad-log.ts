import { Quad } from "./quad";

export type QuadLogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'none';

export class QuadLog {
    private readonly _quad: Quad;
    private _level: QuadLogLevel;

    constructor(quad: Quad, level: QuadLogLevel) {
        this._quad = quad;
        this._level = level;
    }

    get level(): QuadLogLevel {
        return this._level
    }

    setLevel(lvl: QuadLogLevel): this {
        this._level = lvl;
        return this;
    }

    log(level: QuadLogLevel, ...data: Array<any>): this {
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
            logFunction('quad', this._quad.id, 'level', this._quad.level, ...data);
        }
    }

    shouldLog(level: QuadLogLevel): boolean {
        const allowed = new Array<QuadLogLevel>();
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