# Surveillance du taux EUR/ARS (Western Union)

**Dépôt :** [github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS](https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS)

Lien HTML (à coller sur une page web) :

```html
<a href="https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS">WesternUnion-Taux-EUR-PESOS sur GitHub</a>
```

Application [Next.js](https://nextjs.org) qui interroge le routeur GraphQL public de [Western Union](https://www.westernunion.com/es/es/currency-converter/eur-to-ars-rate.html) (corridor par défaut : Espagne → Argentine), compare le taux à un seuil et envoie un e-mail via [Resend](https://resend.com) si le taux le dépasse.

## Seuil d’alerte

Le seuil (ARS pour 1 EUR) est défini dans le code, fichier **[`lib/eur-ars-threshold.ts`](lib/eur-ars-threshold.ts)** — ce n’est pas une donnée secrète : modifie la constante `EUR_ARS_THRESHOLD`, commit, déploiement Vercel automatique. Pas besoin de variable d’environnement ni de duplication GitHub / Vercel pour ce nombre.

## Route API

- `GET /api/check-rate` — réponse JSON : `rate`, `threshold`, `alerted`, `sendAmountEur`, `checkedAt`.

Si `CRON_SECRET` est défini, l’en-tête `Authorization: Bearer <CRON_SECRET>` est obligatoire (pour les appels planifiés, ex. [GitHub Actions](https://docs.github.com/en/actions), ou les tests manuels).

## Variables d’environnement

S’inspirer de [`.env.example`](.env.example) pour `.env.local` (secrets locaux / dev). Résumé :

| Variable | Rôle |
|----------|------|
| `CRON_SECRET` | Secret pour sécuriser les appels (recommandé en production) |
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_FROM` | Expéditeur (domaine vérifié chez Resend) |
| `ALERT_EMAIL` | Destinataire des alertes |

Les variables optionnelles `WU_*` sont documentées dans `.env.example`.

### Resend

Créer un compte Resend, vérifier votre domaine d’envoi (ou utiliser le domaine de test pour le développement), puis utiliser une adresse `RESEND_FROM` autorisée.

## Déploiement Vercel

1. Importer le dépôt dans [Vercel](https://vercel.com) et définir les variables d’environnement (production) : Resend, `CRON_SECRET`, etc. (pas le seuil EUR/ARS, il est dans le code.)
2. Planifier les appels à `GET /api/check-rate` depuis **GitHub Actions** avec l’en-tête `Authorization: Bearer` et **`CRON_SECRET`** comme secret du dépôt.

Test manuel après déploiement :

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://<votre-domaine>/api/check-rate"
```

## Développement local

```bash
npm install
npm run dev
```

Exemple d’appel (avec `CRON_SECRET` dans `.env.local`) :

```bash
curl -sS -H "Authorization: Bearer <ton CRON_SECRET>" "http://localhost:3000/api/check-rate"
```
