import { parentPort, workerData } from 'node:worker_threads';
import { createBetaAccessStore } from '../../src/services/betaAccessStore.js';

const store = createBetaAccessStore({ dbPath: workerData.dbPath });
try {
  Atomics.add(workerData.barrier, 0, 1);
  Atomics.wait(workerData.barrier, 1, 0);
  const result = store.issueSessions({
    codeHash: workerData.codeHash,
    sessions: [
      { scope: 'page', tokenHash: `${workerData.name}-page`, expiresAt: workerData.expiresAt },
      { scope: 'api', tokenHash: `${workerData.name}-api`, expiresAt: workerData.expiresAt }
    ]
  });
  parentPort.postMessage(result);
} finally {
  store.close();
}
