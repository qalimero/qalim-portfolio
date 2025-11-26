# Intégration de la Popin sur maintenance.astro

## ✅ Implémentation complétée

L'intégration de la Popin avec récupération dynamique des données depuis Strapi est terminée. Voici ce qui a été mis en place :

### 1. Schémas Zod (front/src/lib/schemas/strapi.schema.ts)

- `popinContentSchema` : Validation du content-type Popin
- `popinArrayResponseSchema` : Validation de la réponse API Strapi
- Types TypeScript exportés : `PopinContent`, `PopinArrayResponse`

### 2. API Strapi (front/src/lib/api/strapi.ts)

Nouvelle fonction `getPopinsByPage(page: string)` :
- Récupère les popins filtrées par identifiant de page
- Validation automatique avec Zod
- Cache de 5 minutes
- Gestion d'erreurs robuste

### 3. Page maintenance.astro

- Import du composant Popin
- Fetch des données via `getPopinsByPage('maintenance')`
- Passage des props dynamiques : `title`, `closeable`
- Injection du contenu HTML via `set:html`
- **Ouverture automatique au chargement** (DOMContentLoaded + astro:page-load)

### 4. Déclarations TypeScript (front/env.d.ts)

Ajout de l'interface `Window.Popin` pour éviter les erreurs TypeScript

---

## 🔧 Configuration Strapi requise

### Créer le content-type "Popin"

Pour que l'intégration fonctionne, vous devez créer le content-type **Popin** dans l'admin Strapi.

#### Option 1 : Via l'interface Strapi (recommandé)

1. Accédez à l'admin Strapi : `http://localhost:1337/admin`
2. Allez dans **Content-Type Builder**
3. Cliquez sur **Create new collection type**
4. Nom : `popin`
5. Ajoutez les champs suivants :

| Nom du champ | Type       | Requis | Valeur par défaut | Description                          |
|--------------|------------|--------|-------------------|--------------------------------------|
| `title`      | Text       | ✅     | -                 | Titre de la popin                    |
| `content`    | Rich Text  | ✅     | -                 | Contenu HTML de la popin             |
| `closeable`  | Boolean    | ✅     | `true`            | L'utilisateur peut-il fermer ?       |
| `page`       | Text       | ❌     | -                 | Identifiant de page (ex: 'maintenance') |

6. **Sauvegardez** et redémarrez Strapi

#### Option 2 : Via le fichier schema.json

Créez le fichier : `backend/src/api/popin/content-types/popin/schema.json`

```json
{
  "kind": "collectionType",
  "collectionName": "popins",
  "info": {
    "singularName": "popin",
    "pluralName": "popins",
    "displayName": "Popin",
    "description": "Modal popups for different pages"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {
    "i18n": {
      "localized": true
    }
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "content": {
      "type": "richtext",
      "required": true
    },
    "closeable": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "page": {
      "type": "string",
      "required": false
    }
  }
}
```

Puis redémarrez le backend Strapi.

---

## 📝 Créer une popin pour la page maintenance

1. Dans l'admin Strapi, allez dans **Content Manager > Popin**
2. Cliquez sur **Create new entry**
3. Remplissez les champs :
   - **title** : "Informations" (ou votre titre)
   - **content** : Votre contenu HTML/Rich Text
   - **closeable** : `true` (ou `false` pour forcer la lecture)
   - **page** : `maintenance` ⚠️ **Important** : cette valeur doit correspondre au filtre dans le code
4. **Publiez** l'entrée

---

## 🎯 Comportement de la Popin

### Ouverture automatique
- La popin s'ouvre **immédiatement** au chargement de la page maintenance
- À chaque refresh (F5), la popin réapparaît
- Compatible avec Astro View Transitions

### Fermeture
- Si `closeable: true` : bouton de fermeture visible
- Si `closeable: false` : pas de bouton de fermeture (lecture obligatoire)
- Clic sur le backdrop ferme également la popin (si `closeable: true`)

---

## 📂 Fichiers modifiés

- ✅ `front/src/lib/schemas/strapi.schema.ts` - Schémas Zod pour Popin
- ✅ `front/src/lib/api/strapi.ts` - Fonction API `getPopinsByPage()`
- ✅ `front/src/pages/maintenance.astro` - Intégration complète
- ✅ `front/env.d.ts` - Déclarations TypeScript pour `window.Popin`

## 🔄 Réutilisabilité

Cette implémentation est **totalement réutilisable** pour d'autres pages :

```astro
---
import Popin from '@/components/ui/Popin.astro';
import { getPopinsByPage } from '@/lib/api/strapi';

// Récupérer la popin pour "contact" par exemple
const popinsResponse = await getPopinsByPage('contact');
const popinData = popinsResponse.data[0];
---

<Layout>
  <h1>Page Contact</h1>

  {popinData && (
    <Popin
      id="contact-popin"
      title={popinData.title}
      closeable={popinData.closeable}
      autoOpen={true}
    >
      <div set:html={popinData.content} />
    </Popin>
  )}
</Layout>
```

### Ouverture manuelle (sans autoOpen)

Si vous souhaitez ouvrir la popin manuellement avec un bouton :

```astro
<button onclick="window.Popin.open('contact-popin')">
  Afficher les informations
</button>

<Popin
  id="contact-popin"
  title="Informations"
  closeable={true}
  autoOpen={false}
>
  <p>Contenu de la popin</p>
</Popin>
```

---

## ⚙️ Variables d'environnement

Assurez-vous que `STRAPI_URL` est configurée dans `.env` :

```bash
STRAPI_URL=http://localhost:1337
```

---

## 🚀 Tester l'intégration

1. Créez le content-type Popin dans Strapi
2. Créez une entrée Popin avec `page: "maintenance"`
3. Publiez l'entrée
4. Accédez à `http://localhost:4321/maintenance`
5. La popin doit s'ouvrir automatiquement avec vos données Strapi

---

## 🐛 Dépannage

### La popin ne s'affiche pas
- Vérifiez que le content-type Popin existe dans Strapi
- Vérifiez que l'entrée est **publiée** (Draft & Publish)
- Vérifiez que le champ `page` contient bien `"maintenance"`
- Consultez la console du navigateur pour les erreurs

### Erreur de validation Zod
- Vérifiez que les champs requis sont remplis
- Vérifiez que `closeable` est un boolean, pas un string
- Vérifiez que `content` n'est pas vide

### La popin ne s'ouvre pas automatiquement
- Vérifiez que `window.Popin` est défini (console : `console.log(window.Popin)`)
- Vérifiez que l'ID correspond : `maintenance-popin`
- Vérifiez que le script s'exécute après le DOM

---

## 📌 Notes importantes

1. **Le composant Popin.astro est totalement générique** :
   - Aucune logique de fetch dedans
   - Comportement d'ouverture automatique via la prop `autoOpen`
   - Réutilisable sur n'importe quelle page

2. **Les données sont validées avec Zod** : sécurité runtime garantie

3. **Le cache API est de 5 minutes** : performances optimisées

4. **La popin est optionnelle** : si aucune donnée, la page s'affiche normalement

5. **Compatible View Transitions** : la popin se rouvre automatiquement lors des navigations Astro

---

Intégration réalisée avec ❤️ par Claude Code
