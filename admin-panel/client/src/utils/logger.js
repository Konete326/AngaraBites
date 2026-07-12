import { getApiUrl } from './api';

export const initLogger = () => {
  if (window.__logger_initialized__) return;
  window.__logger_initialized__ = true;

  const originalError = console.error;
  const originalWarn = console.warn;
  let isSendingLog = false;
  let logCountThisMinute = 0;
  let minuteTimerStart = Date.now();

  const sendConsoleLogToServer = async (level, args) => {
    const now = Date.now();
    if (now - minuteTimerStart > 60000) {
      logCountThisMinute = 0;
      minuteTimerStart = now;
    }
    if (logCountThisMinute >= 50) {
      return;
    }
    logCountThisMinute++;

    if (isSendingLog) return;
    isSendingLog = true;

    try {
      const message = args
        .map(arg => {
          if (arg instanceof Error) {
            return arg.message + '\n' + arg.stack;
          }
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      let stack = null;
      const errorArg = args.find(arg => arg instanceof Error);
      if (errorArg) {
        stack = errorArg.stack;
      } else {
        const err = new Error();
        stack = err.stack;
        if (stack) {
          const lines = stack.split('\n');
          stack = lines.slice(2).join('\n');
        }
      }

      await fetch(getApiUrl('/api/logs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level, message, stack }),
      });
    } catch (err) {
    } finally {
      isSendingLog = false;
    }
  };

  console.error = function (...args) {
    originalError.apply(console, args);
    sendConsoleLogToServer('error', args);
  };

  console.warn = function (...args) {
    originalWarn.apply(console, args);
    sendConsoleLogToServer('warn', args);
  };
};
