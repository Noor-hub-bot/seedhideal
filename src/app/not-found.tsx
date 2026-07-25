import { ButtonLink, Heading } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <Heading size="lg" className="mb-3">
        Page not found
      </Heading>
      <p className="mb-8 text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist, or may have been moved.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/cars" variant="secondary">
          Browse cars
        </ButtonLink>
      </div>
    </div>
  );
}
