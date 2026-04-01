# Surveillance du taux EUR/ARS (Western Union)

**Dépôt :** [github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS](https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS)

Lien HTML (à coller sur une page web) :

```html
<a href="https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS">WesternUnion-Taux-EUR-PESOS sur GitHub</a>
```

Application [Next.js](https://nextjs.org) qui interroge le routeur GraphQL public de [Western Union](https://www.westernunion.com/es/es/currency-converter/eur-to-ars-rate.html) (corridor par défaut : Espagne → Argentine), compare le taux à un seuil et envoie un e-mail via [Resend](https://resend.com) si le taux le dépasse.

## Seuil EUR/ARS (le « trésor » à ajuster)

Le seuil **n’est pas** dans `.env` : il est dans **[`lib/eur-ars-threshold.ts`](lib/eur-ars-threshold.ts)** (`EUR_ARS_THRESHOLD`, en ARS pour 1 EUR).

Tu modifies **ce fichier seulement** → `git commit` → `git push` → Vercel redéploie : le **calcul** et le **texte du mail** utilisent automatiquement la nouvelle valeur. Rien à changer dans le dashboard Vercel ni dans les secrets GitHub pour ce nombre.

## Secrets (`.env.local` / Vercel)

| Variable | Rôle |
|----------|------|
| `CRON_SECRET` | Secret pour `Authorization: Bearer …` |
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_FROM` | Expéditeur vérifié |
| `ALERT_EMAIL` | Destinataire des alertes |

Optionnel : `WU_QUOTE_EUR_AMOUNT`, `WU_*` — voir [`lib/westernunion-rate.ts`](lib/westernunion-rate.ts).

## Taux actuel vs seuil

- **Taux actuel** : renvoyé par Western Union à l’exécution (`exchangeRate` = ARS pour 1 EUR) dans [`lib/westernunion-rate.ts`](lib/westernunion-rate.ts).
- **Seuil** : constante dans [`lib/eur-ars-threshold.ts`](lib/eur-ars-threshold.ts). Alerte si `rate > threshold`.

## Route API

`GET /api/check-rate` — JSON : `rate`, `threshold`, `alerted`, `sendAmountEur`, `checkedAt`.

Si `CRON_SECRET` est défini, l’en-tête `Authorization: Bearer <CRON_SECRET>` est obligatoire.

## Déploiement Vercel

Importer le dépôt et définir **uniquement** les variables secrètes (Resend, `CRON_SECRET`). **Pas** de `EUR_ARS_THRESHOLD` dans Vercel.

**GitHub Actions** : secret `CRON_SECRET` pour le `curl` ; le seuil vient du code déployé.

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://<votre-domaine>/api/check-rate"
```

## Développement local

`.env.local` avec secrets uniquement, puis :

```bash
npm install
npm run dev
```

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/check-rate"
```
