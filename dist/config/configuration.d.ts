declare const _default: () => {
    env: string;
    port: number;
    databaseUrl: string | undefined;
    redisUrl: string | undefined;
    jwt: {
        accessSecret: string | undefined;
        refreshSecret: string | undefined;
        accessExpiresIn: string;
        refreshExpiresIn: string;
    };
    google: {
        clientId: string | undefined;
    };
    stripe: {
        secretKey: string | undefined;
        webhookSecret: string | undefined;
        basicPriceId: string | undefined;
        tokenPackPriceId: string | undefined;
    };
    agora: {
        appId: string | undefined;
        appCertificate: string | undefined;
    };
    persona: {
        apiKey: string | undefined;
        webhookSecret: string | undefined;
    };
    urls: {
        webBaseUrl: string;
        apiBaseUrl: string;
    };
};
export default _default;
//# sourceMappingURL=configuration.d.ts.map