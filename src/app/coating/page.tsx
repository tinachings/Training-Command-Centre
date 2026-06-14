import { DepartmentTrainingDashboard } from '@/components/department-training-dashboard';

export default function CoatingPage() {
  return (
    <DepartmentTrainingDashboard
      department="Coating"
      title="Coating Dashboard"
      description="The coating dashboard mirrors the surfacing view and is filtered for coating-specific activities."
    />
  );
}
