# Surveillance du taux EUR/ARS (Western Union)

**Dépôt :** [github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS](https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS)

Lien HTML (à coller sur une page web) :

```html
<a href="https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS">WesternUnion-Taux-EUR-PESOS sur GitHub</a>
```

Application [Next.js](https://nextjs.org) qui interroge le routeur GraphQL public de [Western Union](https://www.westernunion.com/es/es/currency-converter/eur-to-ars-rate.html) (corridor par défaut : Espagne → Argentine), compare le taux à un seuil et envoie un e-mail via [Resend](https://resend.com) si le taux le dépasse.

## Configuration

**Tout se configure dans les variables d’environnement** — en local dans **`.env.local`** (fichier à la racine du projet, non versionné), et sur **Vercel** dans *Settings → Environment Variables* pour la production.

| Variable | Rôle |
|----------|------|
| `EUR_ARS_THRESHOLD` | Seuil en **ARS pour 1 EUR** (ex. `1650` = tu alertes quand le taux WU est **> 1650** ARS/€). Pas le même réglage que le montant de cotation `WU_QUOTE_EUR_AMOUNT`. |
| `CRON_SECRET` | Secret pour l’en-tête `Authorization: Bearer …` |
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_FROM` | Expéditeur vérifié |
| `ALERT_EMAIL` | Destinataire des alertes |

Optionnel : `WU_QUOTE_EUR_AMOUNT` (défaut `100`), `WU_SEND_COUNTRY_CODE`, `WU_RECEIVE_COUNTRY_CODE`, `WU_RECEIVE_CURRENCY_CODE`, `WU_LANGUAGE_CODE`, `WU_ROUTER_URL`, `WU_ACCESS_CODE` — voir [`lib/westernunion-rate.ts`](lib/westernunion-rate.ts).

## Où est le « taux euros / pesos » ?

- **Taux actuel** : renvoyé par l’API Western Union au moment de l’appel (champ `exchangeRate` = ARS pour 1 EUR), dans [`lib/westernunion-rate.ts`](lib/westernunion-rate.ts).
- **Ton seuil** (ex. 1 € = 1650 pesos comme référence) : variable **`EUR_ARS_THRESHOLD=1650`** dans `.env.local` (et la même clé sur Vercel). L’alerte part si `rate > threshold` (taux WU strictement supérieur au seuil).

## Route API

- `GET /api/check-rate` — JSON : `rate`, `threshold`, `alerted`, `sendAmountEur`, `checkedAt`.

Si `CRON_SECRET` est défini, l’en-tête `Authorization: Bearer <CRON_SECRET>` est obligatoire.

### Resend

Créer un compte Resend, vérifier le domaine d’envoi (ou le domaine de test en dev).

## Déploiement Vercel

1. Importer le dépôt et recopier les variables de ton `.env.local` dans les **Environment Variables** Vercel (production).
2. **GitHub Actions** : secret `CRON_SECRET` pour le `curl` ; le seuil est lu côté serveur (variables Vercel).

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://<votre-domaine>/api/check-rate"
```

## Développement local

Créer **`.env.local`** avec les variables ci-dessus, puis :

```bash
npm install
npm run dev
```

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/check-rate"
```
