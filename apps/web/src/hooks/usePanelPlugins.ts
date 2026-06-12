import { useQuery } from '@tanstack/react-query';
import type { PluginManifest } from '@openbrige/shared-types';

interface PanelPlugin {
  manifest: PluginManifest;
  placement: string[];
}

export function usePanelPlugins(placement?: string) {
  const { data: plugins = [] } = useQuery<PanelPlugin[]>({
    queryKey: ['panel-plugins', placement],
    queryFn: async () => {
      const res = await fetch('/api/plugins?type=ui-panel');
      if (!res.ok) return [];
      const data = await res.json();
      return (data.plugins ?? []).map((p: { manifest: PluginManifest }) => ({
        manifest: p.manifest,
        placement: p.manifest.placement ?? [],
      }));
    },
  });

  if (placement) {
    return plugins.filter((p) => p.placement.includes(placement));
  }
  return plugins;
}
