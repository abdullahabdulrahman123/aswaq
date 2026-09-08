/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** مفتاح خدمة العناوين من جوجل — فاضي = بنستخدم البديل المجاني (BigDataCloud) */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_WASLA_ISSUER?: string;
  readonly VITE_WASLA_CLIENT_ID?: string;
  readonly VITE_WASLA_ACCOUNT_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
