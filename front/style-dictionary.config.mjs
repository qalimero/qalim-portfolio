import StyleDictionary from 'style-dictionary';
import { register } from '@tokens-studio/sd-transforms';

await register(StyleDictionary);

export default {
    source: ['src/styles/design-system/data-tokens/**/*.json'],
    platforms: {
        css: {
            transformGroup: 'tokens-studio',
            buildPath: 'src/styles/design-system/tokens/',
            files: [
                { 
                    destination: 'design-tokens.css', 
                    format: 'css/variables',
                    options: {
                        selector: ':root'
                    }
                }
            ]
        }
    }
};
