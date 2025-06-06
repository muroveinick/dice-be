if (!Array.prototype.delete) {
    Array.prototype.delete = function <T>(this: Array<T>, value: T): Array<T> {
      const index = this.indexOf(value);
      if (index > -1) {
        this.splice(index, 1);
      }
      return this;
    };
  }
  
  if (!Array.prototype.random) {
    Array.prototype.random = function <T>(this: Array<T>): T {
      const item = this[Math.floor(Math.random() * this.length)] as T;
      return item;
    };
  }
  
  export {};
  