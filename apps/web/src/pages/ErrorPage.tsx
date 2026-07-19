import { StatusPage } from './NotFoundPage';

export function ErrorPage(): JSX.Element {
  return (
    <StatusPage
      code="500"
      title="Bir şeyler ters gitti"
      description="Beklenmeyen bir sistem hatası oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin."
    />
  );
}
