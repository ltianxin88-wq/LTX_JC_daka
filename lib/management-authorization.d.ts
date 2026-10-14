import type { IncomingMessage } from 'node:http';
export interface ManagementAuthorizationView {
    token: string;
    expiresAt: string;
}
export declare class ManagementAuthorization {
    private readonly tokens;
    private readonly codeDigest;
    constructor(codeDigest?: Buffer<ArrayBuffer>);
    authorize(code: string, now?: number): ManagementAuthorizationView;
    assert(req: IncomingMessage, now?: number): void;
    private removeExpired;
}
//# sourceMappingURL=management-authorization.d.ts.map