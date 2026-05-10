# AutoLoc — Location de véhicules (démo)

Site vitrine **moderne** + **backend Express** + **SQLite ou MongoDB** (selon `.env`). Prêt pour **ComeUp Deployable** (Docker) : démo sans base externe, puis passage en **MongoDB** pour un déploiement cloud classique.

## Configuration (`.env`)

1. Copier le modèle : `cp .env.example .env` (ou `cp env.demo .env` pour les valeurs démo fournies).
2. Variables utiles :
   - **`PORT`** — port d’écoute (souvent imposé par la plateforme, ex. `8080`).
   - **`SESSION_SECRET`** — chaîne longue et aléatoire **obligatoire en production** (sessions signées).
   - **`NODE_ENV`** — `production` en ligne (active notamment le cookie `secure` avec HTTPS).
   - **`TRUST_PROXY`** — `true` ou `1` derrière un reverse-proxy (Render, Railway, etc.).
   - **`MONGODB_URI`** — **vide** = SQLite (`data/cars.db`). **Renseigné** = MongoDB (Mongoose), même API.

Le fichier **`.env` n’est pas versionné** (`.gitignore`) ; **`env.demo`** et **`.env.example`** servent de modèles pour l’acheteur ComeUp.

## Démarrage rapide

```bash
npm install
npm start
```

Ouvrir **http://localhost:3000**. Sans `MONGODB_URI`, le fichier **`data/cars.db`** est créé et les véhicules d’exemple sont insérés.

En développement avec rechargement auto du serveur (Node 18+) :

```bash
npm run dev
```

## Structure du projet

| Élément | Rôle |
|--------|------|
| `public/` | Fichiers statiques servis par Express (`index.html`, `css/`, `js/`). |
| `server/index.js` | Application Express : routes API + `express.static`. |
| `server/config.js` | Charge **`.env`** (`dotenv`) et expose port / session / Mongo. |
| `server/store/` | Couche données : **SQLite** (`sqliteStore`) ou **MongoDB** (`mongoStore`) selon `MONGODB_URI`. |
| `server/db.js` | SQLite uniquement : tables + **seed** + compte admin démo. |
| `data/cars.db` | SQLite (généré au runtime, ignoré par Git). |
| `Dockerfile` | Image Node pour **Deployable** / PaaS. |
| `docker-compose.deploy.yml` | Exemple **App + MongoDB** local. |

## Compte administrateur (démo)

Après le premier `npm start`, un compte **admin** est créé s’il n’existe pas encore :

- **E-mail** : `admin@autoloc.demo`
- **Mot de passe** : `AdminDemo2026!`

En production : changez ce mot de passe, définissez **`SESSION_SECRET`** fort et **`NODE_ENV=production`** (cookie `secure` avec HTTPS).

## ComeUp « Deployable » (démo → prod)

1. **Démo immédiate** : laisser `MONGODB_URI` vide → SQLite, aucun service externe ; idéal pour montrer le livrable tel quel.
2. **Après vente / mise en prod** : créer une base **MongoDB Atlas** (ou autre), mettre `MONGODB_URI=mongodb+srv://...`, `SESSION_SECRET=...`, `NODE_ENV=production`, `TRUST_PROXY=1` si la plateforme est derrière un proxy.
3. **Conteneur** : build avec le `Dockerfile`, variables d’environnement injectées par ComeUp / l’hébergeur (pas besoin de `.env` dans l’image).

Test local avec Mongo :

```bash
docker compose -f docker-compose.deploy.yml up --build
```

Puis **http://localhost:3000** — `GET /api/health` indique `"data":"mongodb"` quand Mongo est actif.

## API

### Public

- `GET /api/health` — statut du service ; champ **`data`** : `"sqlite"` ou `"mongodb"`.
- `GET /api/cars` — liste des véhicules (JSON).
- `GET /api/cars/:id` — détail d’un véhicule.
- `GET /api/cars/:id/availability` — périodes **bloquantes** (`pending`, `confirmed`) pour le calendrier de réservation.
- `POST /api/reservations` — JSON : `car_id`, `customer_name`, `email`, `start_date`, `end_date`, **`payment_method`** : `on_site` (défaut) ou `stripe`. Montant **recalculé côté serveur** (jours × prix/jour). Réponse Stripe : `checkoutUrl` (redirection). Sur place : `payment_status` = `awaiting_physical` jusqu’à confirmation admin.
- `GET /api/stripe/session-status?session_id=` — état d’une session Checkout (lecture seule).
- `POST /api/stripe/webhook` — réservé à Stripe (corps brut + signature `STRIPE_WEBHOOK_SECRET`) ; ne pas appeler manuellement.

### Paiement (sécurité)

| Mode | Comportement |
|------|----------------|
| **Stripe Checkout** | Aucune carte ne transite par ton serveur ; Stripe gère le PCI. La clé **secrète** reste dans `.env` / variables d’hébergement. La validation du paiement se fait via **webhook** signé (obligatoire en prod). |
| **Sur place** | Réservation créée avec `payment_status = awaiting_physical`. L’admin clique **« Confirmer paiement sur place »** (`POST /api/admin/reservations/:id/confirm-physical-payment`) après encaissement. |

Configurer **`PUBLIC_APP_URL`** (ex. `https://tondomaine.com`) pour les URLs de retour Stripe. En local : `stripe listen --forward-to localhost:3000/api/stripe/webhook` puis coller le secret webhook dans `STRIPE_WEBHOOK_SECRET`.

### Authentification (cookie `autoloc.sid`, `credentials: 'include'` côté navigateur)

- `POST /api/auth/register` — `email`, `password` (8 caractères min.), `display_name`.
- `POST /api/auth/login` — `email`, `password`.
- `POST /api/auth/logout`.
- `GET /api/auth/me` — `{ user: null }` ou l’objet utilisateur (sans hash de mot de passe).

### Espace connecté

- `GET /api/me/reservations` — réservations du compte connecté (sinon `401`).

### Administration (`role: admin`)

- `GET /api/admin/reservations` — toutes les réservations (+ nom du véhicule).
- `PATCH /api/admin/reservations/:id` — corps `{ "status": "pending" | "confirmed" | "cancelled" }`.
- `POST /api/admin/cars` — ajouter un véhicule (champs alignés sur la table `cars`).
- `PUT /api/admin/cars/:id` — modifier.
- `DELETE /api/admin/cars/:id` — supprime d’abord les réservations liées, puis le véhicule.
- `POST /api/admin/reservations/:id/confirm-physical-payment` — marque le paiement **sur place** comme reçu (`awaiting_physical` → `paid`).

## Choix de la base de données (pour ton offre ComeUp)

| BDD | Intérêt | Limite |
|-----|-----------|--------|
| **SQLite** (utilisé ici) | Zéro installation, un fichier `.db`, parfait pour démo, MVP et petits déploiements. | Concurrence élevée en écriture moins adaptée qu’un serveur SQL. |
| **PostgreSQL** | Standard “production”, transactions, beaucoup d’hébergeurs (Railway, Render, etc.). | Nécessite une instance gérée ou un serveur. |
| **MySQL / MariaDB** | Très répandu en hébergement mutualisé. | Même idée que PostgreSQL côté infra. |
| **MongoDB** | Déjà intégré ici via **`MONGODB_URI`** : hébergement managé (Atlas), horizontal, prêt **Deployable**. | Schéma relationnel exprimé en refs / populate plutôt qu’en SQL pur. |

Ce dépôt gère **SQLite (démo)** et **MongoDB (prod cloud)** avec la **même API REST**. Pour un parcours uniquement SQL, une évolution **PostgreSQL** reste possible en remplaçant la couche `server/store/`.

## Licence / usage

Projet de démonstration — images externes et contenus fictifs ; à remplacer pour une mise en ligne commerciale réelle.
