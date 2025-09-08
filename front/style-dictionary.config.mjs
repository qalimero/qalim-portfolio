// front/style-dictionary.config.mjs
import StyleDictionary from 'style-dictionary';
import { registerTransforms } from '@tokens-studio/sd-transforms';

registerTransforms(StyleDictionary);

export default {
    source: ['src/styles/tokens.json'],
    platforms: {
        tailwind: {
            transformGroup: 'tokens-studio',
            buildPath: 'src/tokens/',
            files: [
                { destination: 'tailwind-tokens.mjs', format: 'javascript/module' },
                { destination: '_tokens.scss', format: 'scss/variables' }
            ]
        }
    }
};
