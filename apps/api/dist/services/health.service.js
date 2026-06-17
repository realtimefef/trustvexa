import { HealthRepository } from '../repositories/health.repository.js';
export class HealthService {
    repository;
    constructor(repository = new HealthRepository()) {
        this.repository = repository;
    }
    ping() {
        return {
            status: 'ok',
            service: '@trustvexa/api',
            dependencies: this.repository.checkDependencies(),
        };
    }
    async healthz() {
        const { status, dependencies } = await this.repository.checkConnectivity();
        return { status, service: '@trustvexa/api', dependencies };
    }
}
//# sourceMappingURL=health.service.js.map