# 🚀 Instructions de Configuration Backend

Suite aux améliorations de sécurité et best practices, suivez ces étapes pour finaliser la configuration.

---

## ⚡ Quick Start

### 1. Installer les nouvelles dépendances

```bash
cd backend
npm install
```

Cela installera :
- ✅ `zod` - Validation des variables d'environnement
- ✅ `winston` - Logger structuré
- ✅ `koa-ratelimit` - Rate limiting
- ✅ `@types/koa` - Types TypeScript

### 2. Mettre à jour votre fichier .env

Assurez-vous que votre `.env` contient toutes les nouvelles variables :

```bash
# Copier depuis l'exemple si besoin
cp .env.example .env.backup
# Puis ajouter les nouvelles variables à votre .env existant
```

**Nouvelles variables requises** :

```env
# Frontend URL (pour CORS)
CLIENT_URL=http://localhost:4321

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_DURATION=60000

# Vérifier que NODE_ENV est défini
NODE_ENV=development
```

### 3. Vérifier la configuration TypeScript

Le projet utilise maintenant le **strict mode** TypeScript. Si vous avez du code personnalisé, il peut nécessiter quelques ajustements :

```bash
# Vérifier les erreurs TypeScript
npm run build
```

### 4. Créer le dossier logs (optionnel)

```bash
mkdir -p logs
```

Note : Le dossier sera créé automatiquement en production, mais vous pouvez le créer manuellement pour le développement.

### 5. Démarrer le serveur

```bash
# Développement
npm run develop

# Production
npm run build
npm run start
```

---

## ✅ Vérifications Post-Installation

### 1. Vérifier la validation des env variables

Au démarrage, vous devriez voir :

```
✓ Environment variables validated successfully
```

Si vous voyez des erreurs, vérifiez que toutes les variables requises sont dans votre `.env`.

### 2. Tester les health checks

```bash
# Health check global
curl http://localhost:1337/_health

# Readiness probe
curl http://localhost:1337/_health/ready

# Liveness probe
curl http://localhost:1337/_health/live
```

Vous devriez recevoir des réponses JSON avec `status: "healthy"` ou `status: "ready"`.

### 3. Vérifier les logs structurés

Les logs dans la console devraient maintenant être colorés et structurés :

```
[12:34:56] info: ✓ Environment variables validated successfully
[12:34:56] info: 🚀 Strapi application is starting...
[12:34:56] info: 📍 Registered 42 routes
[12:34:56] info: 📦 Loaded 6 content types
[12:34:56] info: ✓ Strapi application started successfully
```

### 4. Tester CORS

Depuis votre frontend (http://localhost:4321), testez les appels API. Ils devraient fonctionner normalement avec les nouvelles règles CORS.

---

## 🔧 Configuration Avancée

### Personnaliser le Rate Limiting

Modifier dans `.env` :

```env
# 200 requêtes max
RATE_LIMIT_MAX=200

# Sur 2 minutes (120000ms)
RATE_LIMIT_DURATION=120000
```

### Ajouter des Origines CORS

Modifier `config/middlewares.ts` :

```typescript
origin: [
  env('CLIENT_URL', 'http://localhost:4321'),
  'https://votre-domaine.com',
  'https://www.votre-domaine.com',
],
```

### Configurer les Logs en Production

Les logs sont automatiquement écrits dans `logs/` en production.

Pour personnaliser, modifier `src/lib/logger.ts` :

```typescript
new winston.transports.File({ 
  filename: 'logs/error.log', 
  level: 'error',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
})
```

---

## 🐛 Résolution de Problèmes

### Erreur : "Environment validation failed"

**Cause** : Variables d'environnement manquantes ou invalides

**Solution** :
1. Vérifier votre fichier `.env`
2. Comparer avec `.env.example`
3. S'assurer que toutes les clés requises sont présentes et valides

### Erreur : "Cannot find module 'zod'"

**Cause** : Dépendances non installées

**Solution** :
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Erreur TypeScript après activation du strict mode

**Cause** : Code existant non conforme au strict mode

**Solution** :
- Ajouter des types explicites
- Gérer les valeurs `null` et `undefined`
- Consulter la documentation TypeScript

### Rate limiting trop strict en développement

**Solution** :
```env
# Dans .env
RATE_LIMIT_MAX=1000
RATE_LIMIT_DURATION=60000
```

---

## 📊 Nouveaux Endpoints

| Endpoint | Description | Auth |
|----------|-------------|------|
| `GET /_health` | Health check global | ❌ Non |
| `GET /_health/ready` | Readiness probe | ❌ Non |
| `GET /_health/live` | Liveness probe | ❌ Non |

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- [`BACKEND_IMPROVEMENTS.md`](./BACKEND_IMPROVEMENTS.md) - Documentation complète des changements
- [Strapi Documentation](https://docs.strapi.io/)

---

## 🎯 Prochaines Étapes

1. ✅ Tester toutes les fonctionnalités existantes
2. ✅ Ajouter des tests unitaires (recommandé)
3. ✅ Configurer un monitoring (production)
4. ✅ Migrer vers PostgreSQL (production)
5. ✅ Configurer Redis pour le rate limiting (production)

---

**Besoin d'aide ?** Consultez les logs dans la console ou dans `logs/combined.log` (production).
