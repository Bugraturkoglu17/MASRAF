import { PlaceholderPage } from '@/components/feedback/PlaceholderPage';

export function ExpensesPlaceholderPage(): JSX.Element {
  return (
    <PlaceholderPage
      title="Masraflarım"
      description="Masraf oluşturma ve listeleme ekranı bu sürümde kapsam dışıdır. Backend uçları (POST/GET /expenses) hazırdır; bu sayfa sonraki aşamada bağlanacaktır."
    />
  );
}
