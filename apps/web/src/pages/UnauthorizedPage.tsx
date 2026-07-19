import { StatusPage } from './NotFoundPage';

export function UnauthorizedPage(): JSX.Element {
  return (
    <StatusPage
      code="403"
      title="Yetkiniz yok"
      description="Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsiniz."
    />
  );
}
