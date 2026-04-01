export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  file: string; // path relative to public/
  version: string;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'iot',
    name: 'IoT Communications',
    description: 'Internet of Things — weekly quiz questions covering protocols, hardware, and networking.',
    file: '/modules/iot.json',
    version: '2026-04-01',
  },
  {
    id: 'psd',
    name: 'Professional Software Dev',
    description: 'Professional software development concepts, methodologies, and best practices.',
    file: '/modules/psd.json',
    version: '2026-04-01',
  },
];
