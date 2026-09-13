/**
 * The plain-language answer to "why would I do this?".
 *
 * Every démarche carries an administrative name ("Déclaration d'existence") that
 * means nothing to a first-time filer, so the catalogue ships a one-sentence
 * explanation per code. We prefer that sentence, fall back to the template's own
 * description, and only then to a generic line — never to the raw code.
 */
export function useActionPurpose() {
  const { t } = useI18n();

  return function actionPurpose(code: string, description?: string | null): string {
    const key = `actions.whenToUse.${code}`;
    const translated = t(key);
    if (translated !== key) {
      return translated;
    }
    const fallback = description?.trim();
    return fallback && fallback.length > 0 ? fallback : t("actions.whenToUseFallback");
  };
}
