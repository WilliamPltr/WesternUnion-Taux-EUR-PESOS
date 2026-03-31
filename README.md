# Surveillance du taux EUR/ARS (Western Union)

**Dépôt :** [github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS](https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS)

Lien HTML (à coller sur une page web) :

```html
<a href="https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS">WesternUnion-Taux-EUR-PESOS sur GitHub</a>
```

Application [Next.js](https://nextjs.org) qui interroge le routeur GraphQL public de [Western Union](https://www.westernunion.com/es/es/currency-converter/eur-to-ars-rate.html) (corridor par défaut : Espagne → Argentine), compare le taux à un seuil et envoie un e-mail via [Resend](https://resend.com) si le taux le dépasse.

## Route API

- `GET /api/check-rate` — réponse JSON : `rate`, `threshold`, `alerted`, `sendAmountEur`, `checkedAt`.

Si `CRON_SECRET` est défini, l’en-tête `Authorization: Bearer <CRON_SECRET>` est obligatoire (utilisé par [Vercel Cron](https://vercel.com/docs/cron-jobs) lorsque la variable est configurée sur le projet).

## Variables d’environnement

Copier [`.env.example`](.env.example) vers `.env.local` et renseigner les valeurs. Résumé :

| Variable | Rôle |
|----------|------|
| `EUR_ARS_THRESHOLD` | Seuil (ARS pour 1 EUR) : alerte si `rate > threshold` |
| `CRON_SECRET` | Secret pour sécuriser les appels (recommandé en production) |
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_FROM` | Expéditeur (domaine vérifié chez Resend) |
| `ALERT_EMAIL` | Destinataire des alertes |

Les variables optionnelles `WU_*` sont documentées dans `.env.example`.

### Resend

Créer un compte Resend, vérifier votre domaine d’envoi (ou utiliser le domaine de test pour le développement), puis utiliser une adresse `RESEND_FROM` autorisée.

## Déploiement Vercel

1. Importer le dépôt dans [Vercel](https://vercel.com) et définir les variables d’environnement (production).
2. Définir `CRON_SECRET` : Vercel enverra automatiquement `Authorization: Bearer` vers le chemin du cron.
3. Le fichier [`vercel.json`](vercel.json) planifie `GET /api/check-rate` toutes les 6 heures (UTC). Modifier `schedule` si besoin (syntaxe cron à 5 champs).
4. Les crons ne s’exécutent qu’en **déploiement production**.

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
