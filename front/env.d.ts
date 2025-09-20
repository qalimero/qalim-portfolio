interface ImportMetaEnv {
  readonly STRAPI_URL: string;
  readonly PUBLIC_SITE_URL: string;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
