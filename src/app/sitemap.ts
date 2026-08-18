import type { MetadataRoute } from "next";
import schoolsList from "../../public/schools.json";

const BASE_URL = "https://koululounaslaskuri.fi";

export default function sitemap(): MetadataRoute.Sitemap {
  const schoolUrls: MetadataRoute.Sitemap = schoolsList.map((school) => ({
    url: `${BASE_URL}/koulu/${school.id}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...schoolUrls,
  ];
}
