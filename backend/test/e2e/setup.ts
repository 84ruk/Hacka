/**
 * E2E setup: solo aplica la regla única de env (env-resolver).
 * .env.test se carga en el script test:e2e (dotenv-cli); aquí no se muta ENV salvo vía resolver.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('../../src/config/env-resolver').applyTestEnvOverrides();
