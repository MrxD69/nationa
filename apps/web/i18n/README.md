# Internationalization (i18n)

This app is bilingual: **French (`fr`, default)** and **Arabic (`ar`, RTL)**.
Configuration lives in `nuxt.config.ts` under the `i18n` key, using
[`@nuxtjs/i18n`](https://i18n.nuxtjs.org/) with `strategy: 'no_prefix'`
(no locale in the URL) and lazy-loaded message files.

## File structure

```
i18n/
  locales/
    fr/
      common.json        # shared nav / actions / statuses / labels
      onboarding.json
      companies.json
      cases.json
      documents.json
      checks.json
      submissions.json
      officer.json
      assistant.json
      auth.json
    ar/
      ... same file names ...
  README.md
```

Each locale directory contains **one file per feature**. The module merges
every file for a locale flat into that locale's messages (there is no
filename-based namespacing), so every file exposes its strings under a single
**top-level namespace equal to the feature name**.

## Convention (avoids merge conflicts)

- **One feature = one file per locale.** Feature agents only ever edit their
  own `fr/<feature>.json` and `ar/<feature>.json`.
- **Do not edit another feature's file**, and do not edit `nuxt.config.ts` to
  add strings — the feature files are already registered.
- The top-level key matches the file name:
  - `common.json` → `common.*`
  - `companies.json` → `companies.*`
  - `cases.json` → `cases.*`
  - etc.
- `common.json` holds shared `common.nav.*`, `common.actions.*`,
  `common.status.*`, `common.language.*` and `common.appName`. Reuse these
  instead of duplicating buttons/labels in feature files.
- Untouched feature files are empty `{}` placeholders. When you fill one,
  add the namespace key, e.g.:

```json
// fr/companies.json
{
  "companies": {
    "title": "Entreprises",
    "empty": "Aucune entreprise pour le moment"
  }
}
```

```json
// ar/companies.json
{
  "companies": {
    "title": "الشركات",
    "empty": "لا توجد شركات بعد"
  }
}
```

- Keep both locales in sync: when you add a key to `fr/<feature>.json`, add the
  same key to `ar/<feature>.json` (and vice versa).

## Usage

```ts
const { t } = useI18n();

t("common.nav.companies"); // "Entreprises" / "الشركات"
t("common.actions.save"); // "Enregistrer" / "حفظ"
t("companies.title");
```

## Locale switching & persistence

`app/components/LocaleSwitcher.vue` switches between the two locales via
`setLocale()`. `detectBrowserLanguage` in `nuxt.config.ts` persists the choice
in the `i18n_redirected` cookie and detects the browser language on first
visit, falling back to `fr`.

## RTL

- `ar` is configured with `dir: "rtl"`, `fr` with `dir: "ltr"`.
- `app/app.vue` sets `<html lang dir>` reactively from the active locale via
  `useHead`, so the whole document flips direction when Arabic is selected.
- Prefer Tailwind **logical** utilities so layouts mirror automatically:
  `ps-*`/`pe-*`/`ms-*`/`me-*`/`text-start`/`text-end`/`start-*`/`end-*`
  instead of `pl-*`/`pr-*`/`ml-*`/`mr-*`/`left-*`/`right-*`.
- For one-off overrides use Tailwind's `rtl:` / `ltr:` variants.
- Nuxt UI v4 components use logical properties internally, so they mirror on
  their own.
