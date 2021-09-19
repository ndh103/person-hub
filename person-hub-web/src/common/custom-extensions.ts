export {}

if (!Array.prototype.last) {
  Array.prototype.last = function () {
    if (!this.length) {
      return undefined
    }
    return this[this.length - 1]
  }
}

declare global {
  interface Array<T> {
    last(): T | undefined
  }
}
