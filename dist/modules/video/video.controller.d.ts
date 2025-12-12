import { VideoService } from "./video.service";
import { JwtPayload } from "../../common/types/auth";
export declare class VideoController {
    private readonly videoService;
    constructor(videoService: VideoService);
    getToken(user: JwtPayload, sessionId: string): Promise<{
        token: string;
        channelName: string;
        expiresAt: string;
    }>;
    getAppId(): {
        appId: string;
    };
}
//# sourceMappingURL=video.controller.d.ts.map