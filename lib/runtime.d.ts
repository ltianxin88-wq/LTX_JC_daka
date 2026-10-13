import type { IncomingMessage, ServerResponse } from 'node:http';
export interface WebServerLike {
    register(route: {
        kind: 'exact' | 'prefix';
        path: string;
        handler(req: IncomingMessage, res: ServerResponse): void | Promise<void>;
    }): () => void;
}
export interface RuntimeContextLike {
    webServer?: WebServerLike;
    get(name: string): unknown;
    logger: {
        info(message: unknown): void;
        warn(message: unknown): void;
        error(message: unknown): void;
    };
    effect(factory: () => (() => void | Promise<void>), label?: string): void;
}
//# sourceMappingURL=runtime.d.ts.map