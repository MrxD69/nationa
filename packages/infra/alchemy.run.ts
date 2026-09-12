import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import "varlock/auto-load";

const documentsBucketName = Config.string("R2_BUCKET_NAME");

export const documentsBucket = Cloudflare.R2.Bucket("documents", {
  name: documentsBucketName,
});

export const server = Cloudflare.Worker("server", {
  main: "../../apps/server/src/index.ts",
  compatibility: {
    flags: ["nodejs_compat"],
  },
  env: {
    DATABASE_URL: Config.redacted("DATABASE_URL"),
    CORS_ORIGIN: Config.string("CORS_ORIGIN"),
    OPENROUTER_API_KEY: Config.redacted("OPENROUTER_API_KEY"),
    OPENROUTER_MODEL: Config.string("OPENROUTER_MODEL"),
    SUPABASE_URL: Config.string("SUPABASE_URL"),
    SUPABASE_JWKS_URL: Config.string("SUPABASE_JWKS_URL"),
    SUPABASE_JWT_SECRET: Config.redacted("SUPABASE_JWT_SECRET"),
    R2_BUCKET_NAME: documentsBucketName,
    R2_ACCOUNT_ID: Config.string("R2_ACCOUNT_ID"),
    R2_ACCESS_KEY_ID: Config.redacted("R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: Config.redacted("R2_SECRET_ACCESS_KEY"),
    DOCUMENTS_BUCKET: documentsBucket,
  },
  dev: {
    port: 3000,
  },
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
  "nationa",
  {
    providers: Cloudflare.providers(),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const serverWorker = yield* server;
    const webWorker = yield* Cloudflare.Website.Nuxt("web", {
      rootDir: "../../apps/web",
      env: {
        NUXT_PUBLIC_SERVER_URL: serverWorker.url.as<string>(),
      },
      dev: {
        port: 3001,
      },
    });

    return {
      web: webWorker.url,
      server: serverWorker.url,
    };
  }),
);
