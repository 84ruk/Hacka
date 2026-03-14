import nextConfig from 'eslint-config-next/core-web-vitals';

export default [
  { ignores: ['.next/**', 'out/**', 'node_modules/**', '*.config.*'] },
  ...nextConfig,
];
