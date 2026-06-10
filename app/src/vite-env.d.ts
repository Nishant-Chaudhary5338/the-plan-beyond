/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the API origin (e.g. a staging backend). Defaults to same-origin "/api". */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
