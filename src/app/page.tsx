import schoolsList from "../../public/schools.json";
import SchoolPicker from "@/components/SchoolPicker";

export default function Home() {
  return <SchoolPicker schools={schoolsList} />;
}
