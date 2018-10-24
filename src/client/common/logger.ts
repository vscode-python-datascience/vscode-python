// tslint:disable:no-console

import { injectable } from 'inversify';
import { skipIfTest } from './helpers';
import { ILogger, LogLevel } from './types';

const PREFIX = 'Python Extension: ';

@injectable()
export class Logger implements ILogger {
    // tslint:disable-next-line:no-any
    public static error(title: string = '', message: any) {
        new Logger().logError(`${title}, ${message}`);
    }
    // tslint:disable-next-line:no-any
    public static warn(title: string = '', message: any = '') {
        new Logger().logWarning(`${title}, ${message}`);
    }
    @skipIfTest(false)
    public logError(message: string, ex?: Error) {
        if (ex) {
            console.error(`${PREFIX}${message}`, ex);
        } else {
            console.error(`${PREFIX}${message}`);
        }
    }
    @skipIfTest(false)
    public logWarning(message: string, ex?: Error) {
        if (ex) {
            console.warn(`${PREFIX}${message}`, ex);
        } else {
            console.warn(`${PREFIX}${message}`);
        }
    }
    @skipIfTest(false)
    public logInformation(message: string, ex?: Error) {
        if (ex) {
            console.info(`${PREFIX}${message}`, ex);
        } else {
            console.info(`${PREFIX}${message}`);
        }
    }
}

enum LogOptions {
    None = 0,
    Arguments = 1,
    ReturnValue = 2
}

// tslint:disable-next-line:no-any
function argsToLogString(args: any[]): string {
    try {
        return (args || []).map((item, index) => {
            try {
                return `Arg ${index + 1}: ${JSON.stringify(item)}`;
            } catch {
                return `Arg ${index + 1}: UNABLE TO DETERMINE VALUE`;
            }
        }).join(', ');
    } catch {
        return '';
    }
}

// tslint:disable-next-line:no-any
function returnValueToLogString(returnValue: any): string {
    let returnValueMessage = 'Return Value: ';
    if (returnValue) {
        try {
            returnValueMessage += `${JSON.stringify(returnValue)}`;
        } catch {
            returnValueMessage += 'UNABLE TO DETERMINE VALUE';
        }
    }
    return returnValueMessage;
}

export function traceVerbose(message: string) {
    return trace(message, LogOptions.Arguments | LogOptions.ReturnValue);
}
export function traceError(message: string, ex?: Error) {
    return trace(message, LogOptions.Arguments | LogOptions.ReturnValue, LogLevel.Error);
}
export function traceInfo(message: string) {
    return trace(message);
}
function trace(message: string, options: LogOptions = LogOptions.None, logLevel?: LogLevel) {
    // tslint:disable-next-line:no-function-expression no-any
    return function (_: Object, __: string, descriptor: TypedPropertyDescriptor<any>) {
        const originalMethod = descriptor.value;
        // tslint:disable-next-line:no-function-expression no-any
        descriptor.value = function (...args: any[]) {
            // tslint:disable-next-line:no-any
            function writeSuccess(returnValue?: any) {
                if (logLevel === LogLevel.Error) {
                    return;
                }
                writeToLog(returnValue);
            }
            function writeError(ex: Error) {
                writeToLog(undefined, ex);
            }
            // tslint:disable-next-line:no-any
            function writeToLog(returnValue?: any, ex?: Error) {
                const messagesToLog = [message];
                if ((options && LogOptions.Arguments) === LogOptions.Arguments) {
                    messagesToLog.push(argsToLogString(args));
                }
                if ((options & LogOptions.ReturnValue) === LogOptions.ReturnValue) {
                    messagesToLog.push(returnValueToLogString(returnValue));
                }
                if (ex) {
                    new Logger().logError(messagesToLog.join(', '), ex);
                } else {
                    new Logger().logInformation(messagesToLog.join(', '));
                }
            }
            try {
                // tslint:disable-next-line:no-invalid-this no-use-before-declare no-unsafe-any
                const result = originalMethod.apply(this, args);
                // If method being wrapped returns a promise then wait for it.
                // tslint:disable-next-line:no-unsafe-any
                if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                    // tslint:disable-next-line:prefer-type-cast
                    (result as Promise<void>)
                        .then(data => {
                            writeSuccess(data);
                            return data;
                        })
                        .catch(ex => {
                            writeError(ex);
                            return Promise.reject(ex);
                        });
                } else {
                    writeSuccess(result);
                }
                return result;
            } catch (ex) {
                writeError(ex);
                throw ex;
            }
        };

        return descriptor;
    };
}
