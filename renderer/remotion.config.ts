/**
 * Remotion yapılandırması — M6-C1.
 *
 * Giriş noktası: src/Root.tsx
 * Tüm composition'lar Root.tsx içinde kayıtlıdır.
 *
 * Render çıktısı: backend tarafından subprocess ile tetiklenir.
 * Çıktı dizini: backend'in workspace/{job_id}/artifacts/ altına yönlendirilir.
 */
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/Root.tsx");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
