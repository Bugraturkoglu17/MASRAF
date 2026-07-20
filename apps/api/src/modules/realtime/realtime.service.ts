import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface RealtimeEvent {
  type: 'EXPENSE_SUBMITTED' | 'EXPENSE_APPROVED' | 'EXPENSE_REJECTED';
  organizationId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class RealtimeService {
  private readonly subject = new Subject<RealtimeEvent>();

  emit(event: RealtimeEvent): void {
    this.subject.next(event);
  }

  streamForOrganization(organizationId: string): Observable<MessageEvent> {
    return this.subject.asObservable().pipe(
      filter((e) => e.organizationId === organizationId),
      map(
        (e) =>
          ({
            data: { type: e.type, payload: e.payload },
          }) as MessageEvent,
      ),
    );
  }
}
