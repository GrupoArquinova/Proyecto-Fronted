// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  { ignores: ['dist/**', '.angular/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'public/**', '.vercel/**'] },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.stylistic, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }]
    }
  },
  {
    // En pruebas se simulan servicios y rutas con objetos parciales: ahí se permite any
    files: ['**/*.spec.ts', 'e2e/**/*.ts', 'e2e-csp/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' }
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // "x != null" comprueba null y undefined a la vez; es intencional en las plantillas
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }]
    }
  }
);
