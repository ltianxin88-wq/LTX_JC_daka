import type { PersonalInspectionInternalService, PersonalInspectionResult } from './personal-inspection-service.js';
import type { RuntimeContextLike } from './runtime.js';
export interface PetIntegrationLike {
    announce(input: unknown): {
        ok: boolean;
    };
    registerPanelAction(action: {
        id: string;
        label: string;
        title?: string;
        order?: number;
        onSelect: () => void | Promise<void>;
    }): () => void;
}
export interface PetIntegrationOptions {
    pollIntervalMs?: number;
    maxPolls?: number;
    wait?: (milliseconds: number) => Promise<void>;
}
/**
 * Connect the optional PET surface to the attendance plugin. The returned
 * disposer removes the button; PET never receives the bridge or raw records.
 * Startup inspection is also attempted here and is a no-op without a saved
 * personal account.
 */
export declare function installPetAttendanceIntegration(runtime: RuntimeContextLike, service: PersonalInspectionInternalService, options?: PetIntegrationOptions): () => void;
export declare function toPetAnnouncement(result: PersonalInspectionResult, progress?: number): Record<string, unknown>;
//# sourceMappingURL=pet-integration.d.ts.map