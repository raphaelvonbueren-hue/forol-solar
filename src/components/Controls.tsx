import { LocationSection } from './LocationSection';
import { BuildingSection } from './BuildingSection';
import { EnvironmentSection } from './EnvironmentSection';
import { AnalysisSection } from './AnalysisSection';

export function Controls() {
  return (
    <aside className="controls">
      <LocationSection />
      <BuildingSection />
      <EnvironmentSection />
      <AnalysisSection />
    </aside>
  );
}
