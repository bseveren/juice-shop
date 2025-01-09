export function setLongTimeout(callback: (...args: any[]) => void, ms: number, ...args: any[]): LongTimeoutResult {
    const cb = callback.bind(callback, ...args);

    const longTimeoutResult: LongTimeoutResult = {
        timer: null,
        clearTimeout: function () {
            if (this.timer) {
                clearTimeout(this.timer);
            }
        },
    };

    if (ms <= MAX_TIMEOUT) {
        longTimeoutResult.timer = setTimeout(cb, ms);
    } else {
        let count = Math.floor(ms / MAX_TIMEOUT); // the number of times we need to delay by max
        const remainder = ms % MAX_TIMEOUT; // the length of the final delay

        const delay = () => {
            if (count > 0) {
                count = count - 1;
                longTimeoutResult.timer = setTimeout(delay, MAX_TIMEOUT);
            } else {
                longTimeoutResult.timer = setTimeout(cb, remainder);
            }
        };

        delay();
    }

    return longTimeoutResult;
}
