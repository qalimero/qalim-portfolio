import StyleDictionary from 'style-dictionary';
import { register } from '@tokens-studio/sd-transforms';

// Register tokens-studio transforms
await register(StyleDictionary);

export default {
  // Use W3C token format parser
  log: {
    verbosity: 'verbose',
  },
  
  // Source token files
  source: ['src/data/design-tokens/**/*.json'],
  
  // Preprocessors to handle $themes and token structure
  preprocessors: ['tokens-studio'],
  
  platforms: {
    css: {
      transformGroup: 'tokens-studio',
      buildPath: 'src/styles/tokens/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          options: {
            selector: ':root',
          },
        },
      ],
    },
  },
};
