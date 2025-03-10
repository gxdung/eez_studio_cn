
export function formatBytes(a: number, b?: number) {
    if (a == 0) {
        return "0 字节";
    }
    var c = 1024,
        d = b || 2,
        e = ["字节", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
        // e = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
        f = Math.floor(Math.log(a) / Math.log(c));
    return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f];
}
