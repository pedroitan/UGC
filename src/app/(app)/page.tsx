import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { m } from "@/lib/messages";

const cards = [
  { title: "Para revisar", value: "0", hint: "posts na fila" },
  { title: "Agendados na semana", value: "0", hint: "nada agendado ainda" },
  { title: "Limite da API hoje", value: "0 / —", hint: "consulta em F3" },
  { title: "Pautas quentes", value: "0", hint: "radar em F1" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 px-11 py-9">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-heading text-[40px] font-semibold tracking-tight">
          {m.nav.dashboard}
        </h1>
        <p className="text-sm text-muted-foreground">
          Preencha o Brand Kit e conecte seu Instagram para começar.
        </p>
      </header>
      <section aria-label="Resumo" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader>
              <CardTitle className="font-sans text-sm font-medium text-muted-foreground">
                {c.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <span className="font-heading text-[38px] font-semibold">{c.value}</span>
              <span className="text-[13px] text-muted-foreground">{c.hint}</span>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
