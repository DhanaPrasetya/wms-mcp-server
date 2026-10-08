import type { Request, Response } from "express";
export default class MCPTools {
    constructor();
    private setupTools;
    handleRequest(request: Request, response: Response): Promise<Response<any, Record<string, any>> | undefined>;
    handleSessionRequest(request: Request, response: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=tools.d.ts.map