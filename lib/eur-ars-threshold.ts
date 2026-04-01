/**
 * Seuil d’alerte : ARS pour 1 EUR (non secret).
 * Alerte si le taux Western Union est strictement supérieur à cette valeur.
 *
 * Modifie uniquement ce nombre → commit → push → Vercel redéploie : pas de changement dans Vercel ni GitHub (secrets).
 */
export const EUR_ARS_THRESHOLD = 1650;
