declare global {

  interface Array<T> {
    delete(value: T): Array<T>;
    random(): T;
  }


  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;

      // JWT Configuration
      JWT_SECRET: string;
      JWT_ACCESS_EXPIRES: string;
      JWT_REFRESH_SECRET: string;
      JWT_REFRESH_EXPIRES: string;
    }
  }

}

export { };

