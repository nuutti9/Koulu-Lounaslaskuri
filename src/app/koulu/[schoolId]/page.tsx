import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SCHOOLS } from "@/lib/schools";
import MenuViewer from "@/components/MenuViewer";

type Props = {
  params: Promise<{ schoolId: string }>;
};

export async function generateStaticParams() {
  return SCHOOLS.map((school) => ({ schoolId: school.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { schoolId } = await params;
  const school = SCHOOLS.find((s) => s.id === schoolId);

  if (!school) {
    return {
      title: "Koulu ei löydy - Koululounaslaskuri",
    };
  }

  const cleanName = school.name.replace(/\s*\(Helsinki\)\s*$/, "").trim();

  return {
    title: `${cleanName} Kouluruoka & Ruokalista - Koululounaslaskuri`,
    description: `Katso ${cleanName} ruokalista ja laske kouluruoan kalorit ja makrot (proteiini, hiilihydraatit, rasvat) helposti. Ilmainen lounaslaskuri kaikille.`,
    alternates: {
      canonical: `/koulu/${schoolId}`,
    },
    openGraph: {
      title: `${cleanName} Kouluruoka & Ruokalista - Koululounaslaskuri`,
      description: `Katso ${cleanName} päivän ruokalista ja laske kalorit sekä makrot helposti.`,
      type: "website",
      url: `/koulu/${schoolId}`,
    },
  };
}

export default async function SchoolPage({ params }: Props) {
  const { schoolId } = await params;
  const school = SCHOOLS.find((s) => s.id === schoolId);

  if (!school) {
    notFound();
  }

  return (
    <MenuViewer
      schoolId={schoolId}
      schoolName={school.name}
    />
  );
}
