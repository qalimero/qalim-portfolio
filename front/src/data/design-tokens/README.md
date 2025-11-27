# Design Tokens - Penpot Import Guide

Ce dossier contient les design tokens du projet au format compatible avec Penpot Design.

## Structure des fichiers

Les tokens sont organisés en deux niveaux :

### Foundation (tokens de base)
- **colors.json** - Couleurs de marque et neutres
- **fontFamily.json** - Familles de polices (Satoshi, PP Fraktion Mono)
- **fontSize.json** - Échelle typographique (xxs → xl)
- **spacing.json** - Échelle d'espacement (xxs → 5xl)
- **borderRadius.json** - Rayons de bordure (sm, md)

### Components (tokens sémantiques)
- **marquee.json** - Tokens du composant Marquee
- **popin.json** - Tokens du composant Popin

## Import dans Penpot

Vous avez **deux options** pour importer ces tokens dans Penpot :

### Option 1 : Fichier unique (recommandé)

Import le plus simple via le fichier combiné :

1. Dans Penpot, aller dans **Tools → Design Tokens**
2. Cliquer sur **Import**
3. Sélectionner le fichier **`tokens.json`**
4. Tous les tokens seront importés avec deux sets : `foundation` et `components`

### Option 2 : Fichiers multiples

Pour plus de flexibilité, importer les fichiers individuellement :

1. Créer un fichier `.zip` contenant les dossiers `foundation/` et `components/`
2. Dans Penpot, aller dans **Tools → Design Tokens**
3. Cliquer sur **Import**
4. Sélectionner le fichier `.zip`
5. Chaque fichier sera importé comme un token set séparé

## Format des tokens

Tous les tokens suivent le standard **DTCG 2025.10** (W3C Design Tokens Community Group) :

```json
{
  "foundation": {
    "color": {
      "brand": {
        "primary": {
          "$value": "#3200f2",
          "$type": "color",
          "$description": "Primary brand color - Powerful blue"
        }
      }
    }
  }
}
```

### Propriétés requises
- `$value` : La valeur du token
- `$type` : Le type de token (color, fontSizes, spacing, etc.)
- `$description` : Description du token (optionnel)

### Références entre tokens

Les tokens de composants référencent les tokens de foundation :

```json
{
  "components": {
    "marquee": {
      "background": {
        "color": {
          "$value": "{foundation.color.brand.primary}"
        }
      }
    }
  }
}
```

## Synchronisation avec le code

Les tokens sont compilés dans `src/styles/tokens.css` avec des noms en kebab-case :

```css
/* Foundation tokens */
--color-brand-primary: #3200f2;
--font-size-xs: 16px;
--spacing-md: 16px;

/* Component tokens */
--marquee-background-color: var(--color-brand-primary);
--popin-text-color: var(--color-neutral-lightest);
```

## Modification des tokens

Pour modifier les tokens :

1. Éditer les fichiers JSON dans `foundation/` ou `components/`
2. Regénérer `tokens.json` si nécessaire (ou laisser les scripts de build le faire)
3. Réimporter dans Penpot pour mettre à jour la maquette
4. Les changements seront automatiquement reflétés dans le CSS compilé

## Support

Pour plus d'informations sur les design tokens dans Penpot :
- [Documentation Penpot Design Tokens](https://help.penpot.app/user-guide/design-tokens/)
- [Standard W3C Design Tokens](https://tr.designtokens.org/format/)
