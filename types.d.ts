
import { IUserScheme } from "@shared/interfaces.js";

declare global {
    namespace Express {
        interface Request {
            user?: IUserScheme;
        }
    }


    interface Array<T> {
        delete(value: T): Array<T>;
        random(): T;
    }
}

export { };

