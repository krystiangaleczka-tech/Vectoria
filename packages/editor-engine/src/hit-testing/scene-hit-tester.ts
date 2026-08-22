export {
  hitTestDetailed as hitTestScene,
  hitTestCandidates,
  type HitTestOptions,
  type HitTestResult,
} from '../hit-test.js';

import type { DocumentModel } from '@vectoria/core';
import type { Vec2 } from '@vectoria/shared';
import { hitTestDetailed, type HitTestOptions, type HitTestResult } from '../hit-test.js';

/** Stateless scene hit tester used by editor tools and future spatial indexes. */
export class SceneHitTester {
  hitTest(document: DocumentModel, worldPoint: Vec2, options?: HitTestOptions): HitTestResult | null {
    return hitTestDetailed(document, worldPoint, options)[0] ?? null;
  }

  hitTestAll(document: DocumentModel, worldPoint: Vec2, options?: HitTestOptions): readonly HitTestResult[] {
    return hitTestDetailed(document, worldPoint, options);
  }
}
