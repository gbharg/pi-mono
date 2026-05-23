import kpis from "@/public/data/kpis.json";
import cohortRetention from "@/public/data/cohort_retention.json";
import cohortLtv from "@/public/data/cohort_ltv.json";
import providers from "@/public/data/providers.json";
import services from "@/public/data/services.json";
import locations from "@/public/data/locations.json";
import revenueWaterfall from "@/public/data/revenue_waterfall.json";
import dataQuality from "@/public/data/data_quality.json";
import meta from "@/public/data/meta.json";

export type Kpis = typeof kpis;
export type CohortRetention = typeof cohortRetention;
export type CohortLtv = typeof cohortLtv;
export type Providers = typeof providers;
export type Services = typeof services;
export type Locations = typeof locations;
export type RevenueWaterfall = typeof revenueWaterfall;
export type DataQuality = typeof dataQuality;
export type Meta = typeof meta;

export const data = {
  kpis,
  cohortRetention,
  cohortLtv,
  providers,
  services,
  locations,
  revenueWaterfall,
  dataQuality,
  meta,
};
