import type { Schema, Struct } from '@strapi/strapi';

export interface SharedMarquee extends Struct.ComponentSchema {
  collectionName: 'components_shared_marquees';
  info: {
    description: 'Marquee item with optional link';
    displayName: 'Marquee Item';
  };
  attributes: {
    linkItem: Schema.Attribute.String;
    listItem: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
        minLength: 1;
      }>;
  };
}

export interface SharedPopin extends Struct.ComponentSchema {
  collectionName: 'components_shared_popins';
  info: {
    displayName: 'popin';
  };
  attributes: {
    closable: Schema.Attribute.Boolean;
    text: Schema.Attribute.Blocks;
    title: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.marquee': SharedMarquee;
      'shared.popin': SharedPopin;
    }
  }
}
