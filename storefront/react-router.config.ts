import type {Config} from '@react-router/dev/config';
import {hydrogenPreset} from '@shopify/hydrogen/react-router-preset';
import {vercelPreset} from '@vercel/react-router/vite';

const onVercel = process.env.VERCEL === '1';

/**
 * React Router 7.9.x Configuration for Hydrogen
 *
 * Local development uses the Hydrogen preset for Oxygen. Production on Vercel
 * uses the Vercel preset, which is incompatible with the Hydrogen preset's
 * server-bundle restriction.
 */
export default {
  ssr: true,
  appDirectory: 'app',
  buildDirectory: 'dist',
  future: {
    v8_middleware: true,
    v8_splitRouteModules: true,
    unstable_optimizeDeps: true,
  },
  presets: onVercel ? [vercelPreset()] : [hydrogenPreset()],
} satisfies Config;
