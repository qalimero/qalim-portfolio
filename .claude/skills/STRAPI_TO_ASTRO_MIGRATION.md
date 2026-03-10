1.⁠ ⁠Remove the backend project
2. ⁠Migrate the schema for our information from ⁠ {
  "kind": "singleType",
  "collectionName": "qyu_is_comings",
  "info": {
    "singularName": "qyu-is-coming",
    "pluralName": "qyu-is-comings",
    "displayName": "Qyu is Coming",
    "description": "Portfolio coming soon page"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "title": {
      "type": "string",
      "required": true,
      "minLength": 1,
      "maxLength": 200
    },
    "marquee": {
      "type": "component",
      "repeatable": true,
      "component": "shared.marquee",
      "required": true,
      "min": 1
    },
    "popinInfo": {
      "type": "component",
      "repeatable": true,
      "component": "shared.popin"
    }
  }
} ⁠ to a astro object file collection pointing to ⁠ content/site.config.json ⁠
4.⁠ ⁠Then import the data from that configuration into the respective pages’ head.
5.⁠ ⁠⁠Make sure to use Astro patterns.
6.⁠ ⁠⁠All pages should be rendered at build time.
7.⁠ ⁠⁠We’ll need to setup a CMS that is able to connect with Github to edit the content of our website. Consider using a solution like Netlify’s CMS solution.
