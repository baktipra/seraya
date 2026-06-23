import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/design-system';
import { siteConfig } from '@/config/site';

const foundationItems = [
  'Color roles dan typography global yang konsisten',
  'Primitive reusable untuk action, input, surface, dan status',
  'Dialog serta toast yang accessibility-aware',
  'Token yang siap dipakai dashboard dan public runtime berikutnya',
];

export default function Home() {
  return (
    <main className="bg-seraya-canvas min-h-screen px-6 py-12 sm:px-10 lg:px-16">
      <Card className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl flex-col justify-between gap-16 p-8 sm:p-12">
        <header className="flex items-center justify-between gap-6">
          <span className="text-seraya-text-primary font-serif text-3xl tracking-tight">
            {siteConfig.name}
          </span>
          <Badge variant="brand">SRY-002</Badge>
        </header>

        <section className="max-w-3xl">
          <p className="text-seraya-action-primary mb-5 text-sm font-semibold tracking-[0.16em] uppercase">
            Design system foundation
          </p>
          <h1 className="seraya-display-md max-w-2xl">
            Fondasi visual untuk momen yang terasa personal.
          </h1>
          <p className="seraya-body-lg text-seraya-text-secondary mt-7 max-w-xl">
            Seraya sekarang memiliki token desain, warna semantic, typography global, dan primitive
            yang bisa dipakai secara konsisten tanpa membuat setiap fitur terlihat seperti produk
            terpisah.
          </p>
        </section>

        <section
          aria-labelledby="foundation-title"
          className="border-seraya-border-default border-t pt-8"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="foundation-title"
                className="text-seraya-text-primary font-serif text-2xl tracking-[-0.02em]"
              >
                SRY-002 siap menjadi fondasi bersama
              </h2>
              <p className="text-seraya-text-secondary mt-2 text-sm leading-6">
                Berikutnya: database, auth, dan dashboard shell akan memakai sistem yang sama.
              </p>
            </div>
            <Button disabled variant="secondary">
              Design primitives aktif
            </Button>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2" role="list">
            {foundationItems.map((item) => (
              <li key={item}>
                <Card tone="soft" className="h-full">
                  <CardHeader>
                    <CardTitle className="font-sans text-base font-semibold tracking-normal">
                      Seraya foundation
                    </CardTitle>
                    <CardDescription>{item}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <span className="text-seraya-action-primary text-xs font-semibold tracking-[0.08em] uppercase">
                      Ready
                    </span>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </Card>
    </main>
  );
}
