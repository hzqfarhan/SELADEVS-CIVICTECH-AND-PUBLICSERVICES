import { SERVICES } from "@/lib/feeds";
export function GET() {
  return Response.json({
    provider: "data.gov.my",
    documentedUpdateSeconds: 30,
    applicationCacheSeconds: 35,
    services: SERVICES,
  });
}
