import GerakApp from "@/components/gerak-app";

export default async function BusesPage({
  searchParams,
}: {
  searchParams: Promise<{ bus?: string | string[] }>;
}) {
  const { bus } = await searchParams;

  return (
    <GerakApp
      key="buses"
      initialBus={typeof bus === "string" ? bus : undefined}
    />
  );
}
