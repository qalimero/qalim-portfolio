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
    description: 'Modal/dialog component with rich text content';
    displayName: 'Popin';
  };
  attributes: {
    closable: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    text: Schema.Attribute.Blocks & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
        minLength: 1;
      }>;
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
