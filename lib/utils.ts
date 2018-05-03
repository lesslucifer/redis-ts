export function isString(value: any) {
  const type = typeof value
  return type == 'string' || (type == 'object' && value != null && !Array.isArray(value))
}

export function asBoolean(val: any) {
    if (!val) {
        return false;
    }

    if (val === true) {
        return true;
    }

    if (isString(val)) {
        const str: string = val.toLowerCase();
        return str == 'ok' || str == 'true' || str == 'yes';
    }

    const num = parseInt(val);
    if (!isNaN(num)) {
        return num > 0;
    }

    return false;
}

function isObject(value: any) {
    const type = typeof value
    return value != null && (type == 'object' || type == 'function')
}

export function asDictionary(val: any): {[key: string]: string} | undefined {
    if (isObject(val)) {
        return val;
    }

    if (Array.isArray(val) && val.length % 2 == 0) {
        const dict: {[key: string]: string} = {};
        const n = val.length / 2;
        for (let i = 0; i < n; ++i) {
            dict[<string> val[2 * n]] = val[2 * n + 1];
        }
    }

    return undefined;
}

export function first(array: any[]) {
  return (array != null && array.length)
    ? array[0]
    : undefined
}

export function parseIntNull(val: any) {
    const i = parseInt(val);
    if (!isNaN(i)) {
        return i;
    }

    return null;
}