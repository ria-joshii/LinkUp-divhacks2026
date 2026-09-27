import tseslint from 'typescript-eslint';
export default tseslint.config(
  {ignores:['node_modules/**','dist*/**','server/data/**','.expo/**']},
  ...tseslint.configs.recommended,
  {rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_',caughtErrors:'none'}], '@typescript-eslint/no-explicit-any':'error'}},
);
