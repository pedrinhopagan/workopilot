import { Select } from "./Select";
import { trpc } from "../services/trpc";

type ProjectSelectProps = {
  value: string | null;
  onChange: (projectId: string | null) => void;
  placeholder?: string;
  className?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
};

export function ProjectSelect({
  value,
  onChange,
  placeholder = "Selecione um projeto",
  className = "",
  showAllOption = true,
  allOptionLabel = "Todos os projetos",
}: ProjectSelectProps) {
  const { data: projects = [] } = trpc.projects.list.useQuery();

  const options = [
    ...(showAllOption ? [{ value: "", label: allOptionLabel }] : []),
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Select
      value={value || ""}
      onChange={(v) => onChange(v || null)}
      options={options}
      placeholder={!showAllOption ? placeholder : undefined}
      className={className}
    />
  );
}
