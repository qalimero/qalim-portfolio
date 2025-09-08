import StyleDictionary from 'style-dictionary';
import { register } from '@tokens-studio/sd-transforms';

await register(StyleDictionary);

export default {
    source: ['src/styles/data-tokens/**/*.json'], // prend tous les JSON du dossier tokens
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
