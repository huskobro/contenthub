/**
 * useEffectiveSettingMutation — paylasimli effective setting save mutation.
 *
 * AuroraSettingsPage ve AuroraPromptsPage farkli layoutlar kullaniyor (inline
 * row vs. side-by-side editor) — gorsel primitivi force-merge etmek pre-mature
 * abstraction olurdu. Onun yerine ortak olan (validate + PUT + invalidate +
 * toast) tek hook'a topluyoruz, layout her sayfada local kaliyor.
 *
 * Backend tarafi: PUT /settings/effective/{key} — credential.* anahtarlari
 * credential_resolver'a yonlendirilir, secret tipi ayarlar SettingCipher ile
 * sifrelenir, audit-log degeri secret tipinde maskelenir.
 *
 * Kullanim:
 *   const save = useEffectiveSettingMutation({
 *     onSuccess: () => closeEditor(),
 *     successMessage: (key) => `${key} kaydedildi`,
 *   });
 *   save.mutate({ key, value, settingType: "secret" });
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSettingAdminValue } from "../api/effectiveSettingsApi";
import { useToast } from "./useToast";

export interface EffectiveSettingMutationVars {
  key: string;
  value: unknown;
  /** Setting type — `"secret"` ise bos string kaydetmek hata firlatir. */
  settingType?: string;
}

export interface UseEffectiveSettingMutationOptions {
  /** Mutation basarili olursa cagrilan ekstra callback. */
  onSuccess?: (vars: EffectiveSettingMutationVars) => void;
  /** Hata olusursa cagrilan ekstra callback. */
  onError?: (err: unknown, vars: EffectiveSettingMutationVars) => void;
  /** Basari toast mesaji. Verilmezse default `"<key> kaydedildi"`. */
  successMessage?: (key: string) => string;
  /** Cache invalidation list'ine ekstra query key'ler eklemek icin. */
  extraInvalidationKeys?: ReadonlyArray<readonly unknown[]>;
}

export function useEffectiveSettingMutation(
  options: UseEffectiveSettingMutationOptions = {},
) {
  const toast = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (vars: EffectiveSettingMutationVars) => {
      // Secret tipi alanda bos deger kaydedilirse mevcut credential silinir —
      // yanlislikla overwrite olmasin diye client tarafinda da reject ediyoruz.
      if (
        (vars.settingType || "").toLowerCase() === "secret" &&
        typeof vars.value === "string" &&
        vars.value.trim() === ""
      ) {
        throw new Error(
          "Boş secret kaydedilmez. Gerçek bir değer girin veya kaydı iptal edin.",
        );
      }
      return updateSettingAdminValue(vars.key, vars.value);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["effective-settings"] });
      qc.invalidateQueries({ queryKey: ["effectiveSettings"] });
      for (const key of options.extraInvalidationKeys ?? []) {
        qc.invalidateQueries({ queryKey: key as readonly unknown[] });
      }
      const msg = options.successMessage
        ? options.successMessage(vars.key)
        : `${vars.key} kaydedildi`;
      toast.success(msg);
      options.onSuccess?.(vars);
    },
    onError: (err, vars) => {
      const message =
        err instanceof Error ? err.message : "Kaydedilemedi";
      toast.error(message);
      options.onError?.(err, vars);
    },
  });
}
