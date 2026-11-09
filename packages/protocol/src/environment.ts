import { z } from 'zod';

// What a machine swings in. Sim Manager sets it on simulated machines; a real
// machine would measure its own. Wind direction is in degrees, clockwise on
// screen: 0° blows right, 90° down.
export const environmentSchema = z.object({
  gravity: z.number(),
  windSpeed: z.number(),
  windDirection: z.number(),
  airDensity: z.number(),
});
export type Environment = z.infer<typeof environmentSchema>;

// Just the values that changed, like when one slider in Sim Manager moves.
// Sim Manager and each machine check it, and the machine keeps the rest.
export const environmentPatchSchema = environmentSchema.partial();

// What each value is called and measured in, wherever it's shown.
export const ENVIRONMENT_FIELDS = [
  { name: 'gravity', label: 'Gravity', unit: 'm/s²' },
  { name: 'windSpeed', label: 'Wind speed', unit: 'm/s' },
  { name: 'windDirection', label: 'Wind direction', unit: '°' },
  { name: 'airDensity', label: 'Air density', unit: 'kg/m³' },
] as const;
