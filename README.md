# Surveillance du taux EUR/ARS (Western Union)

**Dépôt :** [github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS](https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS)

Lien HTML (à coller sur une page web) :

```html
<a href="https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS">WesternUnion-Taux-EUR-PESOS sur GitHub</a>
```

Application [Next.js](https://nextjs.org) qui interroge le routeur GraphQL public de [Western Union](https://www.westernunion.com/es/es/currency-converter/eur-to-ars-rate.html) (corridor par défaut : Espagne → Argentine), compare le taux à un seuil et envoie un e-mail via [Resend](https://resend.com) si le taux le dépasse.

## Route API

- `GET /api/check-rate` — réponse JSON : `rate`, `threshold`, `alerted`, `sendAmountEur`, `checkedAt`.

Si `CRON_SECRET` est défini, l’en-tête `Authorization: Bearer <CRON_SECRET>` est obligatoire (pour les appels planifiés, ex. [GitHub Actions](https://docs.github.com/en/actions), ou les tests manuels).

## Variables d’environnement

### Seuil `EUR_ARS_THRESHOLD` (une seule source en production)

En **production sur Vercel**, définis **`EUR_ARS_THRESHOLD` uniquement** dans [Settings → Environment Variables](https://vercel.com/docs/projects/environment-variables) du projet. Tu modifies le seuil là sans changer le code ni le dépôt GitHub ; l’API lit cette valeur au runtime.

**GitHub Actions** n’a pas besoin de dupliquer le seuil : le workflow appelle ton URL Vercel ; c’est le serveur Vercel qui applique le seuil configuré sur Vercel.

En **local**, pour tester : `export EUR_ARS_THRESHOLD=1690` avant `npm run dev`, ou une ligne dans `.env.local` (fichier non versionné).

### Autres variables

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

1. Importer le dépôt dans [Vercel](https://vercel.com) et définir les variables d’environnement (production), dont **`EUR_ARS_THRESHOLD`** et les clés Resend, etc.
2. Planifier les appels à `GET /api/check-rate` depuis **GitHub Actions** (ou un autre orchestrateur) avec l’en-tête `Authorization: Bearer` et **`CRON_SECRET`** comme secret GitHub uniquement (pas besoin d’y mettre le seuil).

Test manuel après déploiement :

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://<votre-domaine>/api/check-rate"
```

## Développement local

```bash
npm install
npm run dev
```

Exemple avec seuil élevé (pas d’e-mail) :

```bash
CRON_SECRET=dev EUR_ARS_THRESHOLD=999999 npm run dev
curl -sS -H "Authorization: Bearer dev" "http://localhost:3000/api/check-rate"
```
