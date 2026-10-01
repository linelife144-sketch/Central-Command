import { StormWorkspace } from '@/components/features/storms/StormWorkspace';
export default async function StormPage({ params }: { params: Promise<{ stormId: string }> }) {
  const { stormId } = await params;
  return <StormWorkspace stormId={stormId} />;
}
