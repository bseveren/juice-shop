export function removeNullProperties<T extends Record<string, any>>(obj: T): T {
    const result = {} as T;
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null) {
            if (typeof value === "object") {
                result[key as keyof T] = removeNullProperties(value);
            } else {
                result[key as keyof T] = value;
            }
        }
    }
    return result;
}


