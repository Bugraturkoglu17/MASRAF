import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, UserCheck, UserX } from 'lucide-react';

import { useToast } from '@/components/feedback/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { apiFetch } from '@/lib/api-client';

type AppRole = 'USER' | 'MANAGER' | 'ADMIN';
type UserStatus = 'ACTIVE' | 'INACTIVE';

interface OrgUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  status: UserStatus;
  profileCompleted: boolean;
  createdAt: string;
}

const roleLabels: Record<AppRole, string> = {
  USER: 'Kullanıcı',
  MANAGER: 'Yönetici',
  ADMIN: 'Admin',
};
const roleColors: Record<AppRole, string> = {
  USER: 'var(--color-text-muted)',
  MANAGER: 'var(--color-pending)',
  ADMIN: 'var(--color-draft)',
};
const roleBgs: Record<AppRole, string> = {
  USER: 'var(--color-bg)',
  MANAGER: 'var(--color-pending-bg)',
  ADMIN: 'var(--color-draft-bg)',
};

export function AdminUsersPage(): JSX.Element {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { user: me } = useAuth();

  const { data: users = [], isLoading } = useQuery<OrgUser[]>({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch('/users'),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AppRole }) =>
      apiFetch(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      showToast(`Rol "${roleLabels[vars.role]}" olarak güncellendi.`, 'success');
    },
    onError: () => showToast('Rol güncellenemedi.', 'error'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      apiFetch(`/users/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      showToast(
        `Kullanıcı ${vars.status === 'ACTIVE' ? 'aktif edildi' : 'pasif edildi'}.`,
        'success',
      );
    },
    onError: () => showToast('Durum güncellenemedi.', 'error'),
  });

  const nextRole = (current: AppRole): AppRole => {
    const cycle: AppRole[] = ['USER', 'MANAGER', 'ADMIN'];
    return cycle[(cycle.indexOf(current) + 1) % cycle.length] ?? 'USER';
  };

  return (
    <div style={{ padding: '28px 32px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 20px' }}>
        Kullanıcı Yönetimi
        {users.length > 0 && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: 'var(--color-text-muted)',
              marginLeft: 8,
            }}
          >
            ({users.length})
          </span>
        )}
      </h1>

      {isLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px 0' }}>
          Yükleniyor...
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                {['Kullanıcı', 'E-posta', 'Rol', 'Durum', 'Profil', 'Kayıt', 'İşlemler'].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                        fontSize: 11,
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h.toUpperCase()}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      background: isSelf ? 'rgba(59,130,246,0.04)' : undefined,
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {u.firstName?.[0]}
                          {u.lastName?.[0]}
                        </div>
                        <span>
                          {u.firstName} {u.lastName}
                          {isSelf && (
                            <span
                              style={{
                                fontSize: 10,
                                color: 'var(--color-text-muted)',
                                marginLeft: 4,
                              }}
                            >
                              (ben)
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-text-muted)' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 12,
                          background: roleBgs[u.role],
                          color: roleColors[u.role],
                          fontWeight: 600,
                          fontSize: 11,
                          border: `1px solid ${roleColors[u.role]}40`,
                        }}
                      >
                        {roleLabels[u.role]}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 12,
                          background:
                            u.status === 'ACTIVE'
                              ? 'var(--color-approved-bg)'
                              : 'var(--color-rejected-bg)',
                          color:
                            u.status === 'ACTIVE'
                              ? 'var(--color-approved)'
                              : 'var(--color-rejected)',
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      >
                        {u.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          color: u.profileCompleted
                            ? 'var(--color-approved)'
                            : 'var(--color-text-muted)',
                        }}
                      >
                        {u.profileCompleted ? 'Tamamlandı' : 'Eksik'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--color-text-muted)', fontSize: 12 }}>
                      {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          disabled={isSelf || roleMut.isPending}
                          onClick={() => {
                            const next = nextRole(u.role);
                            if (
                              window.confirm(
                                `${u.firstName}'in rolünü "${roleLabels[next]}" olarak değiştir?`,
                              )
                            ) {
                              roleMut.mutate({ id: u.id, role: next });
                            }
                          }}
                          title={`Rol değiştir → ${roleLabels[nextRole(u.role)]}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            borderRadius: 5,
                            border: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: isSelf ? 'var(--color-border)' : 'var(--color-primary)',
                            fontSize: 11,
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Shield size={12} /> Rol
                        </button>
                        <button
                          disabled={isSelf || statusMut.isPending}
                          onClick={() => {
                            const next: UserStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                            const label = next === 'ACTIVE' ? 'aktif et' : 'pasif et';
                            if (window.confirm(`${u.firstName}'i ${label}?`)) {
                              statusMut.mutate({ id: u.id, status: next });
                            }
                          }}
                          title={u.status === 'ACTIVE' ? 'Pasif et' : 'Aktif et'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            borderRadius: 5,
                            border: '1px solid var(--color-border)',
                            background: 'transparent',
                            color: isSelf
                              ? 'var(--color-border)'
                              : u.status === 'ACTIVE'
                                ? 'var(--color-rejected)'
                                : 'var(--color-approved)',
                            fontSize: 11,
                            cursor: isSelf ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {u.status === 'ACTIVE' ? (
                            <>
                              <UserX size={12} /> Pasif
                            </>
                          ) : (
                            <>
                              <UserCheck size={12} /> Aktif
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
