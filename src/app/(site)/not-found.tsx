import { Container } from "@/components/site/PageHeader";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center pt-24 text-center">
      <p className="font-display text-6xl text-gold">404</p>
      <h1 className="mt-4 font-display text-3xl">We couldn&apos;t find that page</h1>
      <p className="mt-3 max-w-md text-muted">It may have moved, or the dish may no longer be on the menu.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/menu">Browse the menu</ButtonLink>
        <ButtonLink href="/" variant="outline">
          Go home
        </ButtonLink>
      </div>
    </Container>
  );
}
