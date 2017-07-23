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

export function first(array: any[]) {
  return (array != null && array.length)
    ? array[0]
    : undefined
}