# Surveillance du taux EUR/ARS (Western Union)

**Dépôt :** [github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS](https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS)

Lien HTML (à coller sur une page web) :

```html
<a href="https://github.com/WilliamPltr/WesternUnion-Taux-EUR-PESOS">WesternUnion-Taux-EUR-PESOS sur GitHub</a>
```

Application [Next.js](https://nextjs.org) qui interroge le routeur GraphQL public de [Western Union](https://www.westernunion.com/es/es/currency-converter/eur-to-ars-rate.html) (corridor par défaut : Espagne → Argentine), compare le taux à un seuil et envoie un e-mail via [Resend](https://resend.com) si le taux le dépasse.

## Seuil EUR/ARS à ajuster

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

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://<votre-domaine>/api/check-rate"
```

## Vérification toutes les 5 minutes (GitHub Actions → Vercel)

Le workflow [`.github/workflows/wu-eur-ars-check.yml`](.github/workflows/wu-eur-ars-check.yml) fait un **GET** sur ton API Vercel **toutes les 5 minutes**. Ce n’est pas Vercel qui planifie : c’est **GitHub** qui déclenche le job ; l’API sur Vercel interroge Western Union et envoie l’e-mail via Resend si `rate > seuil` (seuil = [`lib/eur-ars-threshold.ts`](lib/eur-ars-threshold.ts)).

### À faire une fois

1. **Vercel** — Projet lié à ce dépôt, déploiement OK. Dans *Settings → Environment Variables* (Production), définir au minimum : `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `ALERT_EMAIL` (mêmes idées que ton `.env.local`). Repère l’URL du site, ex. `https://ton-projet.vercel.app` ou ton domaine custom.

2. **GitHub** — Ouvre le dépôt → *Settings → Secrets and variables → Actions* :
   - **Secret** `CRON_SECRET` : **exactement la même valeur** que sur Vercel (sinon `401`).
   - **Variable** `CHECK_RATE_URL` : l’URL de base **sans** `/api/...`, ex. `https://ton-projet.vercel.app` (pas de `/` final obligatoire).

3. **Activer Actions** — Onglet *Actions* : si besoin, accepter les workflows pour ce dépôt. Le premier run peut être lancé à la main : *Actions → Western Union EUR/ARS check → Run workflow*.

### Limites utiles à connaître

- Les **crons GitHub** sont en **UTC** ; « toutes les 5 minutes » est le minimum courant pour `schedule`.
- GitHub peut **retarder** un peu les exécutions en période de forte charge.
- Sur dépôt **privé**, les minutes Actions sont comptées dans ton quota ([documentation](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)) ; sur dépôt **public**, c’est généralement gratuit dans une limite raisonnable.
- Vercel **Hobby** limite les *Vercel Cron* (si tu les utilisais) — ici on n’utilise pas les crons Vercel, seulement GitHub.

## Développement local

`.env.local` avec secrets uniquement, puis :

```bash
npm install
npm run dev
```

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/check-rate"
```
