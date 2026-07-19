export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}): JSX.Element {
  return (
    <section>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>{title}</h1>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: 480 }}>{description}</p>
    </section>
  );
}
